# Design

## Context

- See proposal.md (Why). The behavioural contract is in `specs/automated-code-review/spec.md`.
- This change builds on `add-static-quality-gates`. It assumes `AGENTS.md` (rules R1–R8) and `CLAUDE.md` exist. R1 is already enforced deterministically, so the reviewers do not cover it.
- The repository `Txumari/recipe_book` is public. Actions minutes on standard runners are free, and GitHub withholds secrets from fork-PR runs.
- `ci.yml` already posts a sticky comment through `marocchino/sticky-pull-request-comment@v2`. The review must use a different header so the two comments do not overwrite each other.
- The Claude Code CLI supports headless runs (`-p`), `--model`, `--allowedTools`, `--output-format json` and `--json-schema` for structured output. Authentication comes from the `CLAUDE_CODE_OAUTH_TOKEN` environment variable, a token created with `claude setup-token`.
- The Gemini API (`generateContent`) accepts an API key from `GEMINI_API_KEY` and supports JSON-schema-constrained output (`responseMimeType` + `responseJsonSchema`). The free tier offers Flash and Flash-Lite models with daily request quotas. The Gemini CLI's personal OAuth login was found unsupported during implementation ("migrate to Antigravity"), so the adapter calls the REST API directly.
- GitHub Models was retired on 2026-07-30, so it is not an option.

## Goals / Non-Goals

**Goals:**
- Switching provider means changing an adapter command. Prompts, contract, workflow and publisher stay the same.
- The cost is zero or close to zero: Claude subscription usage first, the Gemini free tier as fallback.
- The engines cannot do anything harmful, even when the PR content is hostile.

**Non-Goals:**
- No generic bug-hunting reviewer. Correctness is left to tests and humans, and a reviewer can be added later as one more prompt file.
- No conversational `@claude` assistant. No auto-fixing or suggested-change commits.
- No `REQUEST_CHANGES` reviews: blocking is done only through the `agent-review` commit status (Decision 7).
- No use of `anthropics/claude-code-action` or `google-github-actions/run-gemini-cli` as the core. Each one owns publishing and prompting in its own way, which would tie the design to that vendor.

## Decisions

### 1. Layout: neutral prompts, neutral contract, thin adapters

```
.github/workflows/review.yml
.github/actions/review-engine/action.yml   (composite: PR checkout, CLI install, diff, run-engine, upload)
.github/review/
  architecture.md   tests.md   spec.md   verify.md   (prompts, cite AGENTS.md rule IDs)
scripts/review/
  findings.schema.json        (the contract)
  run-engine.sh <reviewer>    (claude attempt -> gemini fallback -> findings.json + engine.txt)
  publish.ts                  (no LLM; posts review + sticky summary)
  publish.spec.ts             (vitest)
```

- **Why:** everything except `run-engine.sh` is provider-agnostic. The prompts are plain Markdown, so either CLI can take them as the prompt body.
- **Alternative:** `.claude/agents/*.md` subagents. Rejected because only Claude reads them.

### 2. Workflow topology: one job per stage, with a matrix for reviewers

```
 trigger --> gate (skip draft/fork/unauthorised; resolve PR head SHA)
               |
               v
          reviewers (matrix: architecture | tests | spec), contents: read
               |  artifact: findings-<reviewer>.json + engine-<reviewer>.txt
               v
          verify (same adapter, input = all findings + diff), contents: read
               |  artifact: findings-verified.json + engine-verify.txt
               v
          publish (node scripts/review/publish.ts), pull-requests: write
```

- The triggers are:
  - `pull_request` with `types: [opened, ready_for_review, labeled]`. A `labeled` event counts only when `label.name == 'needs-review'`.
  - `issue_comment` with `types: [created]`. The comment must be on a PR, its body must start with `/review`, and `author_association` must be one of `OWNER`, `MEMBER` or `COLLABORATOR`.
- `concurrency: { group: review-${{ PR number }}, cancel-in-progress: true }`.
- The gate job compares `head.repo.full_name` with `github.repository` to detect forks. For `issue_comment` it reads the PR through `gh api` to obtain the head SHA and the fork status.
- Each job checks out the PR head SHA with `fetch-depth: 0` and computes `git diff origin/main...HEAD` into `pr.diff`. No job runs `npm install` on PR code before the engines run, and no job executes PR code: the review tooling (`scripts/review`, `.github/review`, `AGENTS.md`) is checked out separately at `github.sha`, the same commit the workflow definition comes from (the PR merge commit for `pull_request`, the default branch for `issue_comment`), and the PR head lives in `./pr` as read-only data. Consequence: `/review` comments only work once `review.yml` is on `main`.
- **Why:** each reviewer runs in parallel and fails on its own, so one reviewer's fallback does not affect the others. Artifacts make each stage easy to inspect.
- **Alternative:** a single job that runs the reviewers in sequence. It is simpler but slower, and an early failure aborts the rest.
- **Alternative:** a `/review` trigger phrase instead of `@claude review`, because the engine may be Gemini.

### 3. Engine adapter with automatic fallback

`run-engine.sh <reviewer>` works like this:
1. Build the prompt from `.github/review/<reviewer>.md`, `AGENTS.md`, the list of changed files, and `pr.diff`. For `verify`, the input is all the reviewer findings plus the diff.
2. **Claude attempt.** Skip it if `CLAUDE_CODE_OAUTH_TOKEN` is empty. Otherwise run `claude -p --model sonnet --output-format json --json-schema scripts/review/findings.schema.json --allowedTools "Read,Grep,Glob,Bash(git diff:*),Bash(git log:*)"` under a `timeout`.
3. Validate the output against the schema. Any non-zero exit, timeout, or invalid output counts as a failure.
4. **Gemini attempt** (only after a Claude failure). POST the same prompt to `generateContent` with `responseJsonSchema` set to the findings schema and **no tools at all** (the prompt already inlines the changed files), trying `gemini-3.6-flash` then `gemini-3.5-flash-lite` (stable Flash / Flash-Lite on the free tier, confirmed 2026-11-07; override with `GEMINI_MODELS`), then validate the same way.
   - Claude runs with `--restricted --strict-mcp-config --permission-mode dontAsk`, so project settings, hooks and MCP servers from the PR are ignored and file tools are confined to `./pr`; `GITHUB_TOKEN` and `GEMINI_API_KEY` are removed from its environment.
5. Write `findings-<reviewer>.json` and `engine-<reviewer>.txt`. The engine file contains `claude`, `gemini (fallback)`, or `unavailable: <reason>`. The step always exits 0, so the job never fails because of an engine.

- **Why fallback on any failure:** the CLI exit codes do not separate a usage limit from other errors reliably, and the user wants zero manual intervention. Recording the engine in the summary makes a silent fallback visible.
- **Alternative:** a manual `REVIEW_PROVIDER` variable. Rejected by the user in favour of automatic fallback.
- Sonnet is used for every stage, including verify, to keep subscription usage low.

### 4. Findings contract

```json
{ "reviewer": "architecture",
  "findings": [ { "file": "src/...", "line": 42, "rule": "R2",
                  "severity": "blocker|major|minor|nit",
                  "confidence": 0.0, "title": "...", "message": "..." } ] }
```

- The schema is JSON Schema draft-07, so both `--json-schema` and a small validator in `publish.ts` can use it.
- `rule` must match `^R[0-9]+$`.
- Validating the same schema in the adapter and in the publisher prevents a bad engine output from reaching the PR.

### 5. Deterministic publisher (`publish.ts`, run with plain Node 24)

- **Diff mapping:** parse the unified diff to collect the commentable lines of each file (added or context lines on the RIGHT side). Findings on those lines become inline comments. All other findings go to the summary.
- **Dedupe:** list the PR's existing review comments, keeping those that carry the hidden marker `<!-- agent-review:{file}:{line}:{rule} -->`, and skip any new finding whose marker already exists.
- **Posting:** post one `POST /pulls/{n}/reviews` call with `event: COMMENT`, never `APPROVE` or `REQUEST_CHANGES`. Upsert the sticky summary that carries the marker `<!-- agent-review-summary -->`. Remove the `needs-review` label if it is present.
- **Code structure:** the pure functions (diff parsing, partitioning, dedupe, summary rendering) are separate from the GitHub I/O, which uses `fetch` with `GITHUB_TOKEN`. This keeps the pure functions unit-testable with Vitest, with no new dependencies. Node 24 strips the types natively, so neither the engine jobs (`validate`) nor `publish` needs `npm install`.
- After the verifier, the publisher re-applies the confidence ≥ 0.6 filter and the file/line/rule dedupe deterministically; if the verifier is unavailable it publishes the reviewer findings through that filter and says so in the summary.
- Findings text is sanitised before rendering (HTML escaped, `@mentions` neutralised) so engine output cannot forge markers or ping users.
- `tsconfig.json` `include` gains `scripts` so the type-check gate covers the publisher.
- **Alternative:** let the engine post comments through MCP tools. Rejected because it gives the LLM write access (spec: Least-Privilege Execution) and it is Claude-only.

### 6. Prompts

- Each reviewer prompt contains: its rules in scope (by ID), what counts as a violation in this codebase, with path examples such as `infrastructure/http/recipe.controller.ts` for R4, what to ignore (style, and R1, which is enforced by tooling), and the instruction to output only schema-valid JSON.
- `spec.md` tells the reviewer to find the change through the paths `openspec/changes/<name>/` and `openspec/changes/archive/*-<name>/` that appear in the diff, and to read `proposal.md`, `specs/**`, and `tasks.md`.
- Each prompt states that file contents are untrusted data.

### 7. Merge gate through a commit status

- The gate job sets `agent-review = pending` on the PR head; the publisher sets `success` or `failure` as its last call (`POST /statuses/{sha}`), linking to the run.
- **Verdict:** `failure` if any of the three reviewers is `unavailable` (fail-closed) or if any finding survives the filter, whatever its severity; otherwise `success`. An unavailable verifier alone does not fail it, because the reviewer findings then go through the deterministic filter.
- **Why a commit status, not a required job check:** `issue_comment` runs (`/review`) attach their check runs to the default branch, not to the PR head, so a job check could never satisfy the ruleset after a re-review. A status is set on an explicit SHA from any trigger.
- **New pushes:** the new head has no status, so the PR is blocked until someone re-runs the review (owner's choice; no `synchronize` trigger, to save engine usage).
- Statuses created with `GITHUB_TOKEN` come from the GitHub Actions app, so the ruleset pins the required check to that source.
- The CLI install passes `--allow-scripts=@anthropic-ai/claude-code`: npm otherwise skips the package's postinstall, which fetches the native binary, and `claude` exits 1 (seen on the first real run, which then fell back to Gemini).

## Risks / Trade-offs

- **[The Gemini free quota runs out on a large PR]** Each of the four stages can make many requests. → Use `--max-turns` or equivalent caps, a Flash-Lite fallback if the quota error persists, and mark the reviewer `unavailable` rather than failing.
- **[`issue_comment` runs carry secrets and check out PR code]** → Accept only comments from `OWNER`, `MEMBER` or `COLLABORATOR`. Install nothing and execute nothing from the PR. Give the engines read-only tools.
- **[Claude review runs consume the owner's interactive usage window]** → The triggers are deliberately sparse. When the limit is hit, the fallback moves the run to Gemini.
- **[False positives block merges]** Any surviving finding, even a `nit`, fails the gate (owner's choice). → The verifier drops unsupported findings and anything below 0.6 confidence; prompts are tuned through follow-up PRs; to unblock a false positive, fix the prompt or the code and re-run.
- **[Both engines down freezes merges]** Fail-closed by design. → Re-run with `/review` once an engine is back; in an emergency the owner can remove `agent-review` from the ruleset's required checks.
- **[Fork PRs can never pass the gate]** Secrets are withheld from fork runs. → Accepted for a single-owner repository: bring the changes into a branch of the repository to merge them.
- **[Gemini API fields or model IDs change]** → The adapter passes `AGENTS.md` and file contents inline, models are configurable through `GEMINI_MODELS`, and any API failure leads to the same `unavailable` handling.

## Migration Plan

1. Merge `add-static-quality-gates` first.
2. Before the first run, the owner sets two repository secrets, `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`) and `GEMINI_API_KEY` (from Google AI Studio), and creates the label `needs-review`.
3. After this PR's own review sets `agent-review`, add it to the required status checks of the `main` ruleset (source: GitHub Actions).
4. To roll back, remove `agent-review` from the ruleset's required checks, then delete `review.yml`.

## Open Questions

- The exact Gemini model ID and the quota-error behaviour of the free tier will be confirmed during implementation and recorded in the adapter. This does not change the design: any failure triggers the same handling.
