# Tasks

## 1. Project rules documentation

- [x] 1.1 Create `AGENTS.md` at the repo root with rules R1–R8 (ID, one-line statement, one-line rationale each, per design Decision 1); verify every rule ID R1–R8 appears exactly once and each has a rationale
- [x] 1.2 Create `CLAUDE.md` containing `@AGENTS.md` plus only Claude-specific notes (OpenSpec skills, test commands); verify it contains no copied rule text
- [x] 1.3 Set `context` in `openspec/config.yaml` to a short stack summary that points to `AGENTS.md` for rules; verify `openspec context --json` still resolves the root without errors

## 2. Type-check gate

- [x] 2.1 Fix the 4 TS6133 errors without behavior change: `_fieldName` in `positive-number.vo.ts`, `_title` in `recipe-domain.error.ts`, remove the two unused imports in `recipe.service.spec.ts`; verify `npx tsc --noEmit -p tsconfig.json` exits 0 and `npm run test` still passes
- [x] 2.2 Add `"typecheck": "tsc --noEmit -p tsconfig.json"` to `package.json`; verify `npm run typecheck` exits 0, and exits non-zero after temporarily adding an unused local (then revert)

## 3. Architecture boundary gate

- [x] 3.1 Add `dependency-cruiser` as a dev dependency; verify `npx depcruise --version` runs
- [x] 3.2 Create `.dependency-cruiser.cjs` with the `domain-is-pure`, `application-no-infra` and `frontend-no-backend` forbidden rules, each `comment` citing `AGENTS.md R1`, and `options.tsConfig` pointing to `tsconfig.json`; verify relative `.ts` imports resolve (no "not resolvable" warnings for `src/`)
- [x] 3.3 Add `"check:architecture": "depcruise src --config .dependency-cruiser.cjs --output-type err-long"` (`err-long` prints each rule's `comment`, which carries the R1 reference) to `package.json`; verify it exits 0 on the current code, and exits non-zero naming the file, module and `R1` after temporarily adding `import express from 'express'` to a domain file (then revert)
- [x] 3.4 Mention `npm run typecheck` and `npm run check:architecture` under R1 in `AGENTS.md` (the rule names its enforcing command); verify the commands in the doc run as written

## 4. CI integration

- [x] 4.1 In `.github/workflows/ci.yml`, add `Type Check` (`id: typecheck`) and `Architecture Boundaries` (`id: architecture`) steps right after `npm ci`; set `if: ${{ !cancelled() && steps.install.outcome == 'success' }}` on all check/test/build steps after install (E2E additionally requires the Playwright install to succeed); verify the YAML parses (`npx --yes yaml-lint .github/workflows/ci.yml` or equivalent) and step order matches design Decision 4
- [x] 4.2 Extend the sticky comment table with rows for the two gates and render each row as ✅ / ❌ / ⏭️ from `steps.<id>.outcome`; verify on the PR for this change that the comment shows all five rows as passed

## Workflow follow-up

- Propose a separate change to fix `build:backend` (missing `tsconfig.backend.json`).
- Propose a separate change to make `parsePositiveInteger` report the actual field name (requires updating the `recipe-creation` spec message and the frontend copies).
- Continue with `add-agent-code-review`, which depends on `AGENTS.md` from this change.
