@AGENTS.md

## Claude-specific notes

- Plan changes with the OpenSpec workflow: `/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:verify`, `/opsx:archive` (installed locally under `.claude/`, not tracked in git).
- Before finishing a task, run the same checks as CI:
  - `npm run typecheck` and `npm run check:architecture`
  - `npm run test` (Vitest unit + Supertest HTTP)
  - `npm run test:e2e` (Playwright; starts backend on 127.0.0.1:3000 and Vite on 127.0.0.1:5173)
  - `npm run build`
