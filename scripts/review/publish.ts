/**
 * Deterministic publisher for the agent code review (openspec change: add-agent-code-review).
 *
 * No LLM runs here. It validates findings documents against findings.schema.json, maps findings
 * onto the PR diff, posts one non-approving review plus a sticky summary comment, and sets the
 * `agent-review` commit status that the main ruleset requires (the merge gate).
 *
 * Runs on plain Node >= 24 (native type stripping), with no npm dependencies:
 *   node scripts/review/publish.ts validate <findings.json> [expected-reviewer]
 *   node scripts/review/publish.ts publish
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

export const REVIEWERS = ['architecture', 'tests', 'spec'] as const;
export type Reviewer = (typeof REVIEWERS)[number];
export type Stage = Reviewer | 'verify';
export const STAGES: readonly Stage[] = [...REVIEWERS, 'verify'];

export const SEVERITIES = ['blocker', 'major', 'minor', 'nit'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const MIN_CONFIDENCE = 0.6;
export const SUMMARY_MARKER = '<!-- agent-review-summary -->';
export const REVIEW_LABEL = 'needs-review';
/** Commit status context required by the `main` ruleset; it is what makes the review blocking. */
export const STATUS_CONTEXT = 'agent-review';

export interface Finding {
  file: string;
  line: number;
  rule: string;
  severity: Severity;
  confidence: number;
  title: string;
  message: string;
}

export interface FindingsDocument {
  reviewer: Stage;
  findings: Finding[];
}

// ---------------------------------------------------------------------------
// Schema validation (the subset of JSON Schema draft-07 used by findings.schema.json)
// ---------------------------------------------------------------------------

type JsonSchema = {
  type?: string;
  enum?: unknown[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean;
  items?: JsonSchema;
};

const SCHEMA_PATH = fileURLToPath(new URL('./findings.schema.json', import.meta.url));
let cachedSchema: JsonSchema | undefined;

export function loadSchema(): JsonSchema {
  cachedSchema ??= JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as JsonSchema;
  return cachedSchema;
}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number' && Number.isInteger(value)) return 'integer';
  return typeof value;
}

function check(schema: JsonSchema, value: unknown, path: string, errors: string[]): void {
  if (schema.type) {
    const actual = typeOf(value);
    const ok = schema.type === 'number' ? actual === 'number' || actual === 'integer' : actual === schema.type;
    if (!ok) {
      errors.push(`${path}: expected ${schema.type}, got ${actual}`);
      return;
    }
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: must be one of ${schema.enum.join(', ')}`);
  }
  if (typeof value === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: must match ${schema.pattern}`);
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: too short`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${path}: too long`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: must be >= ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: must be <= ${schema.maximum}`);
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, i) => check(schema.items as JsonSchema, item, `${path}[${i}]`, errors));
  }
  if (typeOf(value) === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in obj)) errors.push(`${path}.${key}: is required`);
    }
    for (const [key, child] of Object.entries(obj)) {
      const sub = schema.properties?.[key];
      if (sub) check(sub, child, `${path}.${key}`, errors);
      else if (schema.additionalProperties === false) errors.push(`${path}.${key}: is not allowed`);
    }
  }
}

export type ValidationResult = { ok: true; doc: FindingsDocument } | { ok: false; errors: string[] };

/** Validates raw text or an already-parsed value against the findings contract. */
export function validateFindings(input: unknown, expectedReviewer?: Stage): ValidationResult {
  let value = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch (err) {
      return { ok: false, errors: [`invalid JSON: ${(err as Error).message}`] };
    }
  }
  const errors: string[] = [];
  check(loadSchema(), value, '$', errors);
  if (errors.length === 0 && expectedReviewer && (value as FindingsDocument).reviewer !== expectedReviewer) {
    errors.push(`$.reviewer: expected ${expectedReviewer}`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, doc: value as FindingsDocument };
}

// ---------------------------------------------------------------------------
// Diff mapping
// ---------------------------------------------------------------------------

/** Maps each file in a unified diff to the RIGHT-side line numbers a review comment may target. */
export function parseCommentableLines(diff: string): Map<string, Set<number>> {
  const result = new Map<string, Set<number>>();
  let current: Set<number> | undefined;
  let rightLine = 0;
  let inHunk = false;

  for (const raw of diff.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      current = undefined;
      inHunk = false;
      continue;
    }
    if (!inHunk && raw.startsWith('+++ ')) {
      const target = raw.slice(4).trim();
      if (target === '/dev/null') {
        current = undefined;
      } else {
        const path = target.startsWith('b/') ? target.slice(2) : target;
        current = result.get(path) ?? new Set<number>();
        result.set(path, current);
      }
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      rightLine = Number(hunk[1]);
      inHunk = true;
      continue;
    }
    if (!inHunk || !current) continue;
    if (raw.startsWith('+') || raw.startsWith(' ')) {
      current.add(rightLine);
      rightLine += 1;
    } else if (raw.startsWith('-') || raw.startsWith('\\')) {
      // Deleted line (LEFT side only) or "\ No newline at end of file": not commentable.
    } else if (raw === '') {
      // Trailing newline of the diff, or an empty context line some tools emit without the space.
    } else {
      inHunk = false;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Partitioning and dedupe
// ---------------------------------------------------------------------------

export function markerFor(f: Pick<Finding, 'file' | 'line' | 'rule'>): string {
  return `<!-- agent-review:${f.file}:${f.line}:${f.rule} -->`;
}

/** Extracts every inline-finding marker already present in existing review comment bodies. */
export function extractMarkers(bodies: string[]): Set<string> {
  const markers = new Set<string>();
  for (const body of bodies) {
    for (const m of body.matchAll(/<!-- agent-review:[^\n]*? -->/g)) markers.add(m[0]);
  }
  return markers;
}

const severityRank = (s: Severity): number => SEVERITIES.indexOf(s);

/**
 * Deterministic safety net applied after the verifier: drops findings below MIN_CONFIDENCE and keeps
 * one finding per file/line/rule (the most severe, then the most confident).
 */
export function filterAndDedupe(findings: Finding[]): Finding[] {
  const best = new Map<string, Finding>();
  for (const f of findings) {
    if (f.confidence < MIN_CONFIDENCE) continue;
    const key = markerFor(f);
    const prev = best.get(key);
    if (
      !prev ||
      severityRank(f.severity) < severityRank(prev.severity) ||
      (f.severity === prev.severity && f.confidence > prev.confidence)
    ) {
      best.set(key, f);
    }
  }
  return [...best.values()].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity) || a.file.localeCompare(b.file) || a.line - b.line,
  );
}

export interface Partition {
  inline: Finding[];
  outOfDiff: Finding[];
  alreadyPosted: Finding[];
}

export function partitionFindings(
  findings: Finding[],
  commentable: Map<string, Set<number>>,
  existingMarkers: Set<string>,
): Partition {
  const part: Partition = { inline: [], outOfDiff: [], alreadyPosted: [] };
  for (const f of findings) {
    if (!commentable.get(f.file)?.has(f.line)) part.outOfDiff.push(f);
    else if (existingMarkers.has(markerFor(f))) part.alreadyPosted.push(f);
    else part.inline.push(f);
  }
  return part;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Findings text comes from an LLM that read untrusted PR content. Neutralise anything that could
 * forge our markers, ping users, or inject raw HTML into the comment.
 */
export function sanitize(text: string, max = 2000): string {
  const clipped = text.length > max ? `${text.slice(0, max)}…` : text;
  return clipped
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/@(?=[A-Za-z0-9])/g, '@​');
}

export function renderInlineComment(f: Finding): string {
  return [
    `**${f.rule} · ${f.severity}** — ${sanitize(f.title, 120)}`,
    '',
    sanitize(f.message),
    '',
    `<sub>Agent review · confidence ${f.confidence.toFixed(2)} · rule in AGENTS.md · blocks merge until fixed and re-reviewed</sub>`,
    markerFor(f),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Verdict (merge gate)
// ---------------------------------------------------------------------------

export interface Verdict {
  state: 'success' | 'failure';
  /** Short text for the commit status (GitHub caps it at 140 characters). */
  description: string;
}

/**
 * Fail-closed: the PR passes only when every reviewer actually ran and no finding survived the
 * filter. An unavailable verifier alone does not fail the gate, because the reviewer findings are
 * then published through the deterministic filter instead.
 */
export function computeVerdict(engines: Record<Stage, string>, findings: Finding[]): Verdict {
  const missing = REVIEWERS.filter((r) => (engines[r] ?? 'unavailable').startsWith('unavailable'));
  if (missing.length) {
    return { state: 'failure', description: `Review incomplete: ${missing.join(', ')} unavailable. Re-run with /review or the needs-review label.` };
  }
  if (findings.length) {
    return { state: 'failure', description: `${findings.length} finding(s). Fix them, then re-run with /review or the needs-review label.` };
  }
  return { state: 'success', description: 'No findings.' };
}

export interface SummaryInput {
  headSha: string;
  engines: Record<Stage, string>;
  findings: Finding[];
  partition: Partition;
  verdict: Verdict;
}

export function renderSummary({ headSha, engines, findings, partition, verdict }: SummaryInput): string {
  const counts = SEVERITIES.map((s) => `${s}: ${findings.filter((f) => f.severity === s).length}`).join(' · ');
  const lines = [
    SUMMARY_MARKER,
    '## 🤖 Agent Code Review',
    '',
    `Reviewed commit \`${headSha.slice(0, 7)}\` against the rules in \`AGENTS.md\`.`,
    '',
    verdict.state === 'success'
      ? `**Verdict:** ✅ passed. The \`${STATUS_CONTEXT}\` check allows the merge.`
      : `**Verdict:** ❌ blocks merge. ${verdict.description}`,
    '',
    '| Stage | Engine |',
    '| :--- | :--- |',
    ...STAGES.map((s) => `| ${s} | ${sanitize(engines[s] ?? 'unavailable: no result', 200)} |`),
    '',
    `**Findings:** ${findings.length} (${counts})`,
    `Inline comments: ${partition.inline.length} new, ${partition.alreadyPosted.length} already posted · outside the diff: ${partition.outOfDiff.length}`,
  ];
  if (partition.outOfDiff.length) {
    lines.push('', '### Findings outside the diff', '');
    for (const f of partition.outOfDiff) {
      lines.push(`- **${f.rule} · ${f.severity}** \`${sanitize(f.file, 200)}:${f.line}\` — ${sanitize(f.title, 120)}: ${sanitize(f.message, 500)}`);
    }
  }
  lines.push('', '<sub>Re-run with a `/review` comment or the `needs-review` label. New pushes need a re-run before merging.</sub>');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// GitHub I/O
// ---------------------------------------------------------------------------

export type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export class GitHubClient {
  private readonly base: string;
  private readonly token: string;
  private readonly fetchFn: FetchLike;

  constructor(repo: string, token: string, fetchFn: FetchLike = fetch as unknown as FetchLike, apiUrl = 'https://api.github.com') {
    this.base = `${apiUrl}/repos/${repo}`;
    this.token = token;
    this.fetchFn = fetchFn;
  }

  private async request(method: string, path: string, body?: unknown, allow404 = false): Promise<unknown> {
    const res = await this.fetchFn(`${this.base}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (allow404 && res.status === 404) return undefined;
    if (!res.ok) throw new Error(`GitHub ${method} ${path} failed: ${res.status} ${await res.text()}`);
    return res.status === 204 ? undefined : res.json();
  }

  private async paginate<T>(path: string): Promise<T[]> {
    const all: T[] = [];
    for (let page = 1; ; page += 1) {
      const sep = path.includes('?') ? '&' : '?';
      const batch = (await this.request('GET', `${path}${sep}per_page=100&page=${page}`)) as T[];
      all.push(...batch);
      if (batch.length < 100) return all;
    }
  }

  async listReviewCommentBodies(pr: number): Promise<string[]> {
    const comments = await this.paginate<{ body: string }>(`/pulls/${pr}/comments`);
    return comments.map((c) => c.body ?? '');
  }

  /** Always posts with event COMMENT: blocking happens through the commit status, never APPROVE / REQUEST_CHANGES. */
  async postReview(pr: number, commitId: string, findings: Finding[]): Promise<void> {
    if (findings.length === 0) return;
    await this.request('POST', `/pulls/${pr}/reviews`, {
      commit_id: commitId,
      event: 'COMMENT',
      body: `🤖 Agent review: ${findings.length} new finding(s). See the summary comment for details.`,
      comments: findings.map((f) => ({ path: f.file, line: f.line, side: 'RIGHT', body: renderInlineComment(f) })),
    });
  }

  async upsertSummary(pr: number, body: string): Promise<'created' | 'updated'> {
    const comments = await this.paginate<{ id: number; body: string }>(`/issues/${pr}/comments`);
    const existing = comments.find((c) => (c.body ?? '').includes(SUMMARY_MARKER));
    if (existing) {
      await this.request('PATCH', `/issues/comments/${existing.id}`, { body });
      return 'updated';
    }
    await this.request('POST', `/issues/${pr}/comments`, { body });
    return 'created';
  }

  async removeLabel(pr: number, label: string): Promise<void> {
    await this.request('DELETE', `/issues/${pr}/labels/${encodeURIComponent(label)}`, undefined, true);
  }

  async setStatus(sha: string, verdict: Verdict, targetUrl?: string): Promise<void> {
    await this.request('POST', `/statuses/${sha}`, {
      state: verdict.state,
      context: STATUS_CONTEXT,
      description: verdict.description.slice(0, 140),
      ...(targetUrl ? { target_url: targetUrl } : {}),
    });
  }
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface StageResult {
  engine: string;
  findings: Finding[];
}

/** Reads findings-<stage>.json and engine-<stage>.txt; anything missing or invalid counts as unavailable. */
export function readStage(dir: string, stage: Stage): StageResult {
  const enginePath = `${dir}/engine-${stage}.txt`;
  const findingsPath = `${dir}/findings-${stage}.json`;
  const engine = existsSync(enginePath) ? readFileSync(enginePath, 'utf8').trim() : 'unavailable: no result';
  if (engine.startsWith('unavailable') || !existsSync(findingsPath)) {
    return { engine: engine.startsWith('unavailable') ? engine : 'unavailable: no findings file', findings: [] };
  }
  const result = validateFindings(readFileSync(findingsPath, 'utf8'), stage);
  return result.ok ? { engine, findings: result.doc.findings } : { engine: `unavailable: ${result.errors[0]}`, findings: [] };
}

export interface PublishOptions {
  client: GitHubClient;
  pr: number;
  headSha: string;
  diff: string;
  stages: Record<Stage, StageResult>;
  /** Link shown on the commit status (the workflow run). */
  targetUrl?: string;
}

export interface PublishResult {
  partition: Partition;
  verdict: Verdict;
}

export async function publish({ client, pr, headSha, diff, stages, targetUrl }: PublishOptions): Promise<PublishResult> {
  const engines = Object.fromEntries(STAGES.map((s) => [s, stages[s].engine])) as Record<Stage, string>;
  // Prefer the verifier's output; if it is unavailable, fall back to the raw reviewer findings.
  const verifyOk = !stages.verify.engine.startsWith('unavailable');
  const raw = verifyOk ? stages.verify.findings : REVIEWERS.flatMap((r) => stages[r].findings);
  const findings = filterAndDedupe(raw);
  const verdict = computeVerdict(engines, findings);
  if (!verifyOk) engines.verify = `${engines.verify} (deterministic filter only)`;

  const markers = extractMarkers(await client.listReviewCommentBodies(pr));
  const partition = partitionFindings(findings, parseCommentableLines(diff), markers);

  await client.postReview(pr, headSha, partition.inline);
  await client.upsertSummary(pr, renderSummary({ headSha, engines, findings, partition, verdict }));
  await client.removeLabel(pr, REVIEW_LABEL);
  // Last, so that any earlier failure leaves the gate's `pending` status in place (fail-closed).
  await client.setStatus(headSha, verdict, targetUrl);
  return { partition, verdict };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing environment variable ${name}`);
  return value;
}

async function main(argv: string[]): Promise<number> {
  const [command, ...args] = argv;
  if (command === 'validate') {
    const [file, reviewer] = args;
    if (!file) throw new Error('usage: publish.ts validate <findings.json> [reviewer]');
    const result = validateFindings(readFileSync(file, 'utf8'), reviewer as Stage | undefined);
    if (!result.ok) {
      console.error(result.errors.join('\n'));
      return 1;
    }
    return 0;
  }
  if (command === 'publish') {
    const dir = process.env.REVIEW_DIR ?? 'review-out';
    const stages = Object.fromEntries(STAGES.map((s) => [s, readStage(dir, s)])) as Record<Stage, StageResult>;
    const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
    const { partition, verdict } = await publish({
      client: new GitHubClient(requireEnv('GITHUB_REPOSITORY'), requireEnv('GITHUB_TOKEN')),
      pr: Number(requireEnv('PR_NUMBER')),
      headSha: requireEnv('HEAD_SHA'),
      diff: readFileSync(process.env.DIFF_FILE ?? `${dir}/pr.diff`, 'utf8'),
      stages,
      targetUrl: GITHUB_SERVER_URL && GITHUB_RUN_ID ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}` : undefined,
    });
    console.log(
      `published: ${partition.inline.length} inline, ${partition.alreadyPosted.length} already posted, ${partition.outOfDiff.length} outside the diff`,
    );
    console.log(`${STATUS_CONTEXT}: ${verdict.state} — ${verdict.description}`);
    return 0;
  }
  throw new Error('usage: publish.ts <validate|publish>');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(2);
    },
  );
}
