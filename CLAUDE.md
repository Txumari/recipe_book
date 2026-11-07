@AGENTS.md

## Claude-specific notes

- Plan changes with the OpenSpec workflow: `/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:verify`, `/opsx:archive` (installed locally under `.claude/`, not tracked in git).
- Before finishing a task, run the same checks as CI:
  - `npm run typecheck` and `npm run check:architecture`
  - `npm run test` (Vitest unit + Supertest HTTP)
  - `npm run test:e2e` (Playwright; starts backend on 127.0.0.1:3000 and Vite on 127.0.0.1:5173)
  - `npm run build`

## Code review

`.github/workflows/review.yml` runs an advisory agent review (Claude Sonnet, automatic Gemini fallback) when a PR is opened or marked ready, and on demand. One-time setup by the repository owner:

- `claude setup-token`, then `gh secret set CLAUDE_CODE_OAUTH_TOKEN` and paste the token.
- Create a key in Google AI Studio, then `gh secret set GEMINI_API_KEY` and paste it.
- `gh label create needs-review --color 5319e7 --description "Run the agent code review"`

Re-run a review with a `/review` PR comment (owner, member or collaborator) or `gh pr edit <number> --add-label needs-review`. Test the engine locally with `REVIEW_LOCAL_AUTH=1 REVIEW_DIR=/tmp/review BASE_REF=origin/main scripts/review/run-engine.sh architecture`.
