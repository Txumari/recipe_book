# Tasks

## 1. Findings contract

- [x] 1.1 Create `scripts/review/findings.schema.json` (draft-07, per design Decision 4; `rule` pattern `^R[0-9]+$`, severity enum, confidence 0–1, empty `findings` allowed); verify a valid sample and an empty list pass and a sample with `severity: "critical"` fails, using the validator from 2.1
- [x] 1.2 Add `scripts` to `tsconfig.json` `include`; verify `npm run typecheck` still exits 0

## 2. Publisher (pure logic, test-first)

- [x] 2.1 Implement schema validation for findings documents in `scripts/review/publish.ts`; verify `publish.spec.ts` covers valid, empty and malformed documents
- [x] 2.2 Implement unified-diff parsing into commentable RIGHT-side lines per file; verify tests cover added lines, context lines, deleted lines (not commentable), multiple hunks and renamed files
- [x] 2.3 Implement partitioning of findings into inline vs summary and dedupe against existing `<!-- agent-review:{file}:{line}:{rule} -->` markers; verify tests for in-diff, out-of-diff and already-posted findings
- [x] 2.4 Implement summary rendering (reviewed SHA, engine per reviewer incl. `gemini (fallback)` / `unavailable: <reason>`, counts by severity, out-of-diff findings, `<!-- agent-review-summary -->` marker); verify snapshot-style tests for all-claude, mixed-fallback and reviewer-unavailable cases
- [x] 2.5 Implement GitHub I/O (list review comments, `POST /pulls/{n}/reviews` with `event: COMMENT`, upsert sticky summary, remove `needs-review` label) with `fetch` + `GITHUB_TOKEN`; verify tests with a mocked `fetch` assert the event is never `APPROVE`/`REQUEST_CHANGES` and the summary is updated, not duplicated

## 3. Engine adapter

- [x] 3.1 Create `scripts/review/run-engine.sh <reviewer>` building the prompt (prompt file + `AGENTS.md` + changed files + `pr.diff`; for `verify`, all reviewer findings + diff); verify locally that the assembled prompt file contains all parts
- [x] 3.2 Add the Claude attempt (`claude -p --model sonnet --output-format json --json-schema … --allowedTools "Read,Grep,Glob,Bash(git diff:*),Bash(git log:*)"` under `timeout`, skipped when `CLAUDE_CODE_OAUTH_TOKEN` is empty) with schema validation; verify a local run against a small diff yields valid `findings-<reviewer>.json` and `engine-<reviewer>.txt = claude`
- [x] 3.3 Add the Gemini fallback (Flash model via REST `generateContent`, JSON-schema output, no tools) triggered by any Claude failure, and the `unavailable: <reason>` path when both fail; verify by running with an empty `CLAUDE_CODE_OAUTH_TOKEN` (expects `gemini (fallback)`) and with both credentials empty (expects `unavailable`, exit 0); record the confirmed Gemini model ID in the script (verified in CI on PR #4: Claude failed and every stage recorded `gemini (fallback)`; the both-empty case recorded `unavailable` on the first run)

## 4. Reviewer prompts

- [x] 4.1 Write `.github/review/architecture.md` (R2–R5, codebase-specific examples, ignore R1/style, untrusted-content notice, JSON-only output); verify by running the adapter on a scratch branch that moves a title check into `recipe.controller.ts` and expecting an R2 finding
- [x] 4.2 Write `.github/review/tests.md` (R6–R7); verify on a scratch branch that adds an HTTP route without a supertest test, expecting an R6 finding
- [x] 4.3 Write `.github/review/spec.md` (R8, locating the change under `openspec/changes/` or `archive/`); verify on a scratch branch that omits a scenario from an archived change, expecting an R8 finding, and on a branch without any change, expecting the "no associated change" finding
- [x] 4.4 Write `.github/review/verify.md` (merge duplicates, drop confidence < 0.6 and unsupported findings); verify that feeding it two duplicate findings and one 0.3-confidence finding returns a single finding
- [x] 4.5 Add a short "Review findings" note to `AGENTS.md` explaining that findings cite rule IDs and how they gate merges; verify the note stays under 5 lines

## 5. Workflow

- [x] 5.1 Create `.github/workflows/review.yml` with triggers, gate job (draft / fork / `author_association` / label-name checks, head-SHA resolution) and `concurrency` per PR; verify with `actionlint` (or `npx --yes @action-validator/cli`) that it parses (verified by GitHub accepting and running it on PR #4)
- [x] 5.2 Add `reviewers` matrix, `verify` and `publish` jobs with per-job permissions (`contents: read` for engines, `pull-requests: write` only on publish), PR-head checkout with `fetch-depth: 0`, artifacts between stages, and secrets passed only to engine steps; verify via `actionlint` and by inspecting that no engine job has write permissions (verified by the PR #4 runs and a structural check of the permissions)
- [x] 5.3 Document the one-time setup (secrets `CLAUDE_CODE_OAUTH_TOKEN`, `GEMINI_API_KEY`; label `needs-review`; `/review` usage) in `CLAUDE.md` under a "Code review" heading; verify the commands listed there run as written

## 6. End-to-end verification

- [x] 6.1 Open the PR for this change and confirm: review starts on open, inline comments land on diff lines, sticky summary shows engine per reviewer and is separate from the CI sticky comment, the workflow concludes successfully, and the `agent-review` status matches the findings (verified on #4, clean `success`, and on throwaway #5 with deliberate R2/R4/R6/R8 violations: 7 findings, all inline on their diff lines, status `failure`, PR `BLOCKED`)
- [x] 6.2 Push a commit without trigger and confirm no run starts; then re-run with the `needs-review` label and confirm a re-run that does not duplicate prior inline comments and removes nothing but the label (verified on #5: no run and no status after the push; label re-run posted 0 new / 7 already-posted comments, updated the single summary, removed the label)
- [x] 6.3 Temporarily remove `CLAUDE_CODE_OAUTH_TOKEN` (or set it invalid), re-run, and confirm the summary shows `gemini (fallback)` for every reviewer; restore the secret (verified on #4 while the stored token was invalid: every stage recorded `gemini (fallback)`)
- [x] 6.4 After merging, comment `/review` on an open PR and confirm it re-runs the review and sets `agent-review` on the PR head (`issue_comment` workflows only run from `main`) (verified on #6: the `issue_comment` run from `main` set `pending` then `success` on the PR head and updated the existing summary; an unrelated bot comment's run was skipped without cancelling it)

## 7. Merge gate

- [x] 7.1 Add `computeVerdict` (failure on any surviving finding or any unavailable reviewer; success otherwise) and `setStatus` (`agent-review` commit status, set last) to `publish.ts`, and show the verdict in the summary; verify with Vitest for clean, nit-only, reviewer-unavailable, verifier-unavailable and interrupted-publish cases
- [x] 7.2 Set `agent-review = pending` from the gate job and grant `statuses: write` only to gate and publish; verify the YAML parses and no engine job gets the permission
- [x] 7.3 Harden the Claude path: `--allow-scripts` install with a `claude --version` check, strip whitespace from credentials, log Claude's JSON result on failure; verify the next run on PR #4 records `claude` for every stage (verified: run on `ceee285` used Claude for all four stages)
- [x] 7.4 Add `agent-review` (source GitHub Actions) to the required status checks of the `main` ruleset; verify PR #4 is not mergeable while the status is pending or failing, and is once it succeeds (verified on PR #4)
- [x] 7.5 Update `AGENTS.md` and `CLAUDE.md` to describe the gate, the re-run after each push, and the emergency switch-off

## Workflow follow-up

- Archive the change after the end-to-end checks pass.
- Tune reviewer prompts in follow-up PRs based on observed noise.
