# Proposal

## Why

The project's architectural conventions (hexagonal layering, domain error hierarchy, use-case/port pairing, test levels, OpenSpec conformance) exist only implicitly in code and archived design docs, so neither humans nor AI agents can check them consistently. The CI pipeline also never type-checks: `npm run build` runs `vite build` only, and `tsc --noEmit` currently reports 4 errors that have gone unnoticed. This change writes the rules down once and enforces the mechanical ones deterministically. It is the base for the follow-up agent code review (`add-agent-code-review`).

## What Changes

- Add a provider-neutral `AGENTS.md` at the repository root that states the project rules (R1–R8) with a one-line rationale each, readable by any AI tool and by humans.
- Add a minimal `CLAUDE.md` that imports `AGENTS.md` (`@AGENTS.md`) and holds only Claude-specific notes.
- Point `openspec/config.yaml` `context` at `AGENTS.md` instead of duplicating the rules.
- Fix the 4 existing `tsc --noEmit` errors (unused parameters/imports) without changing any user-visible error message.
- Add a TypeScript type-check gate (`npm run typecheck`) and an architecture-boundary gate (`npm run check:architecture`) that enforces rule R1 (layer dependencies).
- Run both gates in `.github/workflows/ci.yml` before the test steps, fail the job when either fails, and add both to the sticky PR results comment.

## Capabilities

### New Capabilities
- `code-quality-gates`: Deterministic static checks (type-checking and architecture-boundary enforcement) that run locally and in CI, block merges on violation, and are traceable to the documented project rules.

### Modified Capabilities
<!-- None. The existing CI requirements in `recipe-creation` remain valid: the gates add steps and summary rows without changing the existing test, build, comment, or artifact behavior. -->

## Impact

- New files: `AGENTS.md`, `CLAUDE.md`, `.dependency-cruiser.cjs`.
- `package.json`: new `typecheck` and `check:architecture` scripts; new dev dependency `dependency-cruiser`.
- `.github/workflows/ci.yml`: two new steps and two new rows in the sticky comment table.
- `openspec/config.yaml`: `context` field set.
- Source fixes (behavior-preserving): `src/backend/domain/value-objects/positive-number.vo.ts`, `src/backend/domain/errors/recipe-domain.error.ts`, `src/backend/tests/recipe.service.spec.ts`.
- Out of scope: the broken `build:backend` script (references a missing `tsconfig.backend.json`) and the misleading step-number validation message; both are noted as follow-ups.
