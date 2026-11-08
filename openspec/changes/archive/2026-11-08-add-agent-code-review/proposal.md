# Proposal

## Why

The deterministic gates from `add-static-quality-gates` cover only the mechanical rules. The judgment rules in `AGENTS.md` still depend on someone remembering to check them on every PR: R2 (invariants), R4 (error mapping), R5 (use-case shape), R6 and R7 (test levels and teardown), and R8 (OpenSpec conformance). An AI review can check them automatically, and it must gate merges so a rule violation cannot land unnoticed. It has to cost close to nothing and survive switching AI providers.

## What Changes

- Add a `.github/workflows/review.yml` workflow. It runs a multi-reviewer AI code review when a PR is opened, when it is marked ready for review, and on demand through the `needs-review` label or a `/review` comment. Draft and fork PRs are skipped.
- Add three specialised reviewers (`architecture`, `tests`, `spec`) plus a verifier. Their prompts are provider-neutral files under `.github/review/`, and they cite rules from `AGENTS.md` instead of restating them.
- Define a common `findings.json` contract that every reviewer must produce, whatever the provider.
- Add an engine adapter that runs each reviewer headless. It uses Claude Sonnet first, authenticated with `CLAUDE_CODE_OAUTH_TOKEN`, and falls back automatically to Gemini (`GEMINI_API_KEY`) when Claude fails.
- Add a deterministic publisher script with no LLM. It turns verified findings into inline PR review comments plus a sticky summary that names the engine each reviewer used.
- Make the review a merge gate: the publisher sets an `agent-review` commit status on the PR head, and the `main` ruleset requires it. The status fails on any surviving finding and whenever a reviewer could not run (fail-closed). New pushes need a manual re-review before merging.
- Give the AI engines read-only access to the repository. Only the publisher holds GitHub write permission.

## Capabilities

### New Capabilities
- `automated-code-review`: A blocking AI review of pull requests against the documented project rules. It covers triggers, reviewer coverage, the findings contract, provider fallback, publishing, and the security boundaries.

### Modified Capabilities
<!-- None. The CI workflow and the `code-quality-gates` behaviour are unchanged; the review is a separate workflow whose status the ruleset requires. -->

## Impact

- New files:
  - `.github/workflows/review.yml`
  - `.github/actions/review-engine/action.yml` (composite action shared by the reviewer and verifier jobs)
  - `.github/review/{architecture,tests,spec,verify}.md`
  - `scripts/review/` (engine adapter, findings schema, publisher and its tests)
- `tsconfig.json`: `include` extended with `scripts` so the type-check gate covers the publisher.
- `AGENTS.md`: a short note on how review findings reference rule IDs.
- Repository settings: the `CLAUDE_CODE_OAUTH_TOKEN` and `GEMINI_API_KEY` secrets and the `needs-review` label (owner), and the `agent-review` status added to the required status checks of the `main` ruleset.
- Fork PRs are never reviewed (secrets are withheld), so they cannot satisfy the gate and must be brought into a branch of the repository to merge.
- Cost:
  - Claude review runs consume the owner's Claude subscription usage.
  - Gemini fallback runs use the Gemini API free tier, whose content may be used by Google. That is acceptable because the repository is public.
- Depends on `add-static-quality-gates`, which provides `AGENTS.md`.
