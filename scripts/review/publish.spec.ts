import { describe, expect, it, vi } from 'vitest';
import {
  GitHubClient,
  STATUS_CONTEXT,
  computeVerdict,
  extractMarkers,
  filterAndDedupe,
  markerFor,
  parseCommentableLines,
  partitionFindings,
  publish,
  renderInlineComment,
  renderSummary,
  validateFindings,
  type FetchLike,
  type Finding,
  type Stage,
  type StageResult,
} from './publish.ts';

const finding = (over: Partial<Finding> = {}): Finding => ({
  file: 'src/backend/infrastructure/http/recipe.controller.ts',
  line: 12,
  rule: 'R2',
  severity: 'major',
  confidence: 0.9,
  title: 'Validation in controller',
  message: 'Title length is checked in the controller instead of Recipe.create().',
  ...over,
});

describe('validateFindings (findings.schema.json)', () => {
  it('accepts a valid document', () => {
    const result = validateFindings(JSON.stringify({ reviewer: 'architecture', findings: [finding()] }));
    expect(result.ok).toBe(true);
  });

  it('accepts an empty findings list', () => {
    expect(validateFindings({ reviewer: 'tests', findings: [] }).ok).toBe(true);
  });

  it('rejects an unknown severity', () => {
    const result = validateFindings({ reviewer: 'spec', findings: [finding({ severity: 'critical' as Finding['severity'] })] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join()).toContain('severity');
  });

  it('rejects malformed JSON, bad rule IDs, out-of-range confidence and extra fields', () => {
    expect(validateFindings('{"reviewer": "spec", "findings": [').ok).toBe(false);
    expect(validateFindings({ reviewer: 'spec', findings: [finding({ rule: 'rule-2' })] }).ok).toBe(false);
    expect(validateFindings({ reviewer: 'spec', findings: [finding({ confidence: 1.5 })] }).ok).toBe(false);
    expect(validateFindings({ reviewer: 'spec', findings: [{ ...finding(), extra: true }] }).ok).toBe(false);
    expect(validateFindings({ reviewer: 'spec', findings: [finding({ line: 0 })] }).ok).toBe(false);
    expect(validateFindings({ findings: [] }).ok).toBe(false);
  });

  it('rejects a document produced for a different reviewer when one is expected', () => {
    expect(validateFindings({ reviewer: 'tests', findings: [] }, 'spec').ok).toBe(false);
  });
});

describe('parseCommentableLines', () => {
  const diff = [
    'diff --git a/src/a.ts b/src/a.ts',
    'index 111..222 100644',
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -1,4 +1,5 @@',
    ' line one',
    '-removed two',
    '+added two',
    '+added three',
    ' line four',
    '@@ -20,2 +21,2 @@ function x() {',
    ' context 21',
    '-gone',
    '+replaced 22',
    'diff --git a/src/old.ts b/src/new.ts',
    'similarity index 90%',
    'rename from src/old.ts',
    'rename to src/new.ts',
    '--- a/src/old.ts',
    '+++ b/src/new.ts',
    '@@ -5,1 +5,1 @@',
    '-before',
    '+after',
    '\\ No newline at end of file',
    'diff --git a/src/deleted.ts b/src/deleted.ts',
    'deleted file mode 100644',
    '--- a/src/deleted.ts',
    '+++ /dev/null',
    '@@ -1,1 +0,0 @@',
    '-bye',
    '',
  ].join('\n');

  const lines = parseCommentableLines(diff);

  it('includes added and context lines on the RIGHT side', () => {
    expect([...(lines.get('src/a.ts') ?? [])]).toEqual([1, 2, 3, 4, 21, 22]);
  });

  it('handles multiple hunks per file', () => {
    expect(lines.get('src/a.ts')?.has(21)).toBe(true);
    expect(lines.get('src/a.ts')?.has(20)).toBe(false);
  });

  it('keys renamed files by their new path', () => {
    expect([...(lines.get('src/new.ts') ?? [])]).toEqual([5]);
    expect(lines.has('src/old.ts')).toBe(false);
  });

  it('never makes deleted lines or deleted files commentable', () => {
    expect(lines.has('src/deleted.ts')).toBe(false);
  });
});

describe('filterAndDedupe and partitionFindings', () => {
  it('drops findings below 0.6 confidence and merges duplicates on file/line/rule', () => {
    const result = filterAndDedupe([
      finding({ severity: 'minor', confidence: 0.7 }),
      finding({ severity: 'major', confidence: 0.8 }),
      finding({ line: 40, confidence: 0.3 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('major');
  });

  it('splits findings into inline, outside the diff and already posted', () => {
    const commentable = new Map([[finding().file, new Set([12, 13])]]);
    const posted = extractMarkers([`old comment\n${markerFor(finding({ line: 13 }))}`, 'unrelated']);
    const part = partitionFindings(
      [finding(), finding({ line: 13 }), finding({ line: 99 }), finding({ file: 'src/other.ts' })],
      commentable,
      posted,
    );
    expect(part.inline.map((f) => f.line)).toEqual([12]);
    expect(part.alreadyPosted.map((f) => f.line)).toEqual([13]);
    expect(part.outOfDiff.map((f) => `${f.file}:${f.line}`)).toEqual([`${finding().file}:99`, 'src/other.ts:12']);
  });
});

describe('computeVerdict (merge gate)', () => {
  const ok: Record<Stage, string> = { architecture: 'claude', tests: 'gemini (fallback)', spec: 'claude', verify: 'claude' };

  it('passes when every reviewer ran and nothing was found', () => {
    expect(computeVerdict(ok, []).state).toBe('success');
  });

  it('fails on any finding, even a nit', () => {
    const v = computeVerdict(ok, [finding({ severity: 'nit' })]);
    expect(v.state).toBe('failure');
    expect(v.description).toContain('1 finding');
  });

  it('fails closed when a reviewer is unavailable', () => {
    const v = computeVerdict({ ...ok, tests: 'unavailable: no CLAUDE_CODE_OAUTH_TOKEN; no GEMINI_API_KEY' }, []);
    expect(v.state).toBe('failure');
    expect(v.description).toContain('tests unavailable');
  });

  it('does not fail only because the verifier is unavailable', () => {
    expect(computeVerdict({ ...ok, verify: 'unavailable: timeout' }, []).state).toBe('success');
  });

  it('keeps the status description within the GitHub limit', () => {
    const all = { architecture: 'unavailable: x', tests: 'unavailable: x', spec: 'unavailable: x', verify: 'unavailable: x' };
    expect(computeVerdict(all, []).description.length).toBeLessThanOrEqual(140);
  });
});

describe('rendering', () => {
  const engines = (over: Partial<Record<Stage, string>> = {}): Record<Stage, string> => ({
    architecture: 'claude',
    tests: 'claude',
    spec: 'claude',
    verify: 'claude',
    ...over,
  });
  const empty = { inline: [], outOfDiff: [], alreadyPosted: [] };

  it('renders the summary when every stage ran on Claude', () => {
    const f = finding();
    expect(
      renderSummary({
        headSha: 'abcdef1234567',
        engines: engines(),
        findings: [f],
        partition: { ...empty, inline: [f] },
        verdict: computeVerdict(engines(), [f]),
      }),
    ).toMatchSnapshot();
  });

  it('renders the summary with mixed fallback and out-of-diff findings', () => {
    const out = finding({ file: 'src/backend/domain/entities/recipe.entity.ts', line: 80, rule: 'R4', severity: 'blocker' });
    expect(
      renderSummary({
        headSha: 'abcdef1234567',
        engines: engines({ tests: 'gemini (fallback)', verify: 'gemini (fallback)' }),
        findings: [out],
        partition: { ...empty, outOfDiff: [out] },
        verdict: computeVerdict(engines(), [out]),
      }),
    ).toMatchSnapshot();
  });

  it('renders the summary when a reviewer is unavailable', () => {
    expect(
      renderSummary({
        headSha: 'abcdef1234567',
        engines: engines({ spec: 'unavailable: claude exit 1; gemini quota exceeded' }),
        findings: [],
        partition: empty,
        verdict: computeVerdict(engines({ spec: 'unavailable: claude exit 1; gemini quota exceeded' }), []),
      }),
    ).toMatchSnapshot();
  });

  it('neutralises mentions and forged markers coming from findings text', () => {
    const body = renderInlineComment(finding({ message: 'ping @octocat <!-- agent-review-summary --> <img src=x>' }));
    expect(body).not.toContain('@octocat');
    expect(body).not.toContain('<!-- agent-review-summary -->');
    expect(body).not.toContain('<img');
    expect(body.trimEnd().endsWith(markerFor(finding()))).toBe(true);
  });
});

type Call = { method: string; url: string; body?: Record<string, unknown> };

function fakeGitHub(state: { reviewComments?: { body: string }[]; issueComments?: { id: number; body: string }[] } = {}) {
  const calls: Call[] = [];
  const fetchFn: FetchLike = vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
    const method = init?.method ?? 'GET';
    calls.push({ method, url, body: init?.body ? JSON.parse(init.body) : undefined });
    const json = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data, text: async () => '' });
    if (method === 'GET' && url.includes('/pulls/7/comments')) return json(state.reviewComments ?? []);
    if (method === 'GET' && url.includes('/issues/7/comments')) return json(state.issueComments ?? []);
    if (method === 'DELETE') return json(null, 404);
    return json({}, 201);
  });
  return { calls, client: new GitHubClient('Txumari/recipe_book', 't0ken', fetchFn) };
}

const stages = (verifyFindings: Finding[], verifyEngine = 'claude'): Record<Stage, StageResult> => ({
  architecture: { engine: 'claude', findings: [finding({ rule: 'R5', confidence: 0.95 })] },
  tests: { engine: 'gemini (fallback)', findings: [] },
  spec: { engine: 'claude', findings: [] },
  verify: { engine: verifyEngine, findings: verifyFindings },
});

const diff = ['diff --git a/x b/x', `+++ b/${finding().file}`, '@@ -10,0 +12,1 @@', '+const x = 1;', ''].join('\n');

describe('GitHub I/O (mocked fetch)', () => {
  it('posts a COMMENT review, creates the summary and removes the label', async () => {
    const { calls, client } = fakeGitHub();
    await publish({ client, pr: 7, headSha: 'abc1234', diff, stages: stages([finding()]) });

    const review = calls.find((c) => c.method === 'POST' && c.url.endsWith('/pulls/7/reviews'));
    expect(review?.body?.event).toBe('COMMENT');
    expect(review?.body?.commit_id).toBe('abc1234');
    expect((review?.body?.comments as unknown[]).length).toBe(1);
    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/issues/7/comments'))).toBe(true);
    expect(calls.some((c) => c.method === 'DELETE' && c.url.endsWith('/issues/7/labels/needs-review'))).toBe(true);
  });

  it('sets a failing agent-review status on the head commit when there are findings, as the last call', async () => {
    const { calls, client } = fakeGitHub();
    await publish({ client, pr: 7, headSha: 'abc1234', diff, stages: stages([finding()]), targetUrl: 'https://run' });
    const last = calls[calls.length - 1];
    expect(last.method).toBe('POST');
    expect(last.url.endsWith('/statuses/abc1234')).toBe(true);
    expect(last.body).toMatchObject({ state: 'failure', context: STATUS_CONTEXT, target_url: 'https://run' });
  });

  it('sets a passing status when nothing survives the filter', async () => {
    const { calls, client } = fakeGitHub();
    await publish({ client, pr: 7, headSha: 'abc1234', diff, stages: stages([finding({ confidence: 0.2 })]) });
    const status = calls.find((c) => c.url.endsWith('/statuses/abc1234'));
    expect(status?.body).toMatchObject({ state: 'success', context: STATUS_CONTEXT });
  });

  it('leaves the gate pending (no final status) when publishing fails midway', async () => {
    const failing = new GitHubClient('Txumari/recipe_book', 't0ken', async (url, init) => {
      if (init?.method === 'POST' && url.endsWith('/issues/7/comments')) return { ok: false, status: 500, json: async () => ({}), text: async () => 'boom' };
      if (init?.method === 'POST' && url.includes('/statuses/')) throw new Error('status must not be set');
      return { ok: true, status: 200, json: async () => [], text: async () => '' };
    });
    await expect(publish({ client: failing, pr: 7, headSha: 'abc1234', diff, stages: stages([]) })).rejects.toThrow('500');
  });

  it('never approves or requests changes, even with a blocker', async () => {
    const { calls, client } = fakeGitHub();
    await publish({ client, pr: 7, headSha: 'abc1234', diff, stages: stages([finding({ severity: 'blocker' })]) });
    for (const c of calls) {
      expect(c.body?.event ?? 'COMMENT').toBe('COMMENT');
    }
  });

  it('updates the existing summary instead of adding a second one, and skips already-posted inline comments', async () => {
    const { calls, client } = fakeGitHub({
      reviewComments: [{ body: `earlier\n${markerFor(finding())}` }],
      issueComments: [
        { id: 1, body: '## CI Test Results' },
        { id: 42, body: '<!-- agent-review-summary -->\nold' },
      ],
    });
    await publish({ client, pr: 7, headSha: 'abc1234', diff, stages: stages([finding()]) });

    expect(calls.some((c) => c.method === 'PATCH' && c.url.endsWith('/issues/comments/42'))).toBe(true);
    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/issues/7/comments'))).toBe(false);
    expect(calls.some((c) => c.url.endsWith('/pulls/7/reviews'))).toBe(false);
  });

  it('falls back to the raw reviewer findings when the verifier is unavailable', async () => {
    const { calls, client } = fakeGitHub();
    await publish({ client, pr: 7, headSha: 'abc1234', diff, stages: stages([], 'unavailable: timeout') });
    const review = calls.find((c) => c.url.endsWith('/pulls/7/reviews'));
    expect(JSON.stringify(review?.body)).toContain('R5');
    const summary = calls.find((c) => c.url.endsWith('/issues/7/comments') && c.method === 'POST');
    expect(String(summary?.body?.body)).toContain('unavailable: timeout (deterministic filter only)');
  });
});
