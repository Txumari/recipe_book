# Design

## Context

- See proposal.md (Why) for motivation.
- The backend follows hexagonal layering (`src/backend/{domain,application,infrastructure}`). Today every import already respects the boundaries: domain imports only domain, application imports domain plus its own ports and DTOs, infrastructure imports application, domain, `express`, `cors`, `fs`, and `path`. The frontend imports only React and its own modules.
- `tsconfig.json` is strict (`noUnusedLocals`, `noUnusedParameters`), uses `allowImportingTsExtensions`, and includes `src/`. CI never runs `tsc`, and `tsc --noEmit` reports 4 TS6133 errors:
  - `positive-number.vo.ts`: `fieldName` is unused in `parsePositiveInteger`.
  - `recipe-domain.error.ts`: `title` is unused in `DuplicateRecipeTitleError`.
  - `recipe.service.spec.ts`: two unused imports.
- `package.json` has `"type": "module"`, and there is no ESLint setup.
- The fixed message "Servings and prep time must be greater than zero." is part of the `recipe-creation` spec, and the frontend forms show the same text.

## Goals / Non-Goals

**Goals:**
- Keep one written source of project rules that every AI tool and every human reads.
- Run deterministic, zero-cost gates that block merges, and make every violation point to a rule ID.
- Get the codebase to a clean type-check without changing any observable behavior.

**Non-Goals:**
- No ESLint or style or formatting rules.
- No type-checking of `e2e/` or the root config files, which are outside `tsconfig.json`'s `include`.
- No fix to `build:backend`, which references a missing `tsconfig.backend.json`.
- No fix to the misleading step-number validation message.
- No move of the existing CI requirements out of `recipe-creation`.

## Decisions

### 1. `AGENTS.md` is the single source of rules; the other files point to it
- `AGENTS.md` sits at the root and holds the rules R1–R8. Each rule has a stable ID, a one-line statement, and a one-line "why".
- `CLAUDE.md` contains `@AGENTS.md` plus Claude-only notes, such as which OpenSpec skills exist and how to run the test suites.
- `openspec/config.yaml` `context` gives a short stack summary and says the rules are in `AGENTS.md`.
- **Why:** `AGENTS.md` is the de-facto cross-tool convention, read natively by Codex, Cursor, Copilot, and Gemini CLI (via configuration). Claude Code reaches it through the import. When a rule changes, it changes in one place.
- **Alternatives:** Rules in `CLAUDE.md` would tie them to one vendor. A `docs/CONVENTIONS.md` file would not be discovered automatically by any tool.
- **Rule outline:**
  - R1: layer boundaries
  - R2: entities use a private constructor and `static create()`, and keep invariants in the domain
  - R3: validated primitives are branded value objects
  - R4: business errors extend `RecipeDomainError` and the controller maps them to HTTP
  - R5: each use case has a port in `application/ports` and a service in `application/use-cases`, and the repository changes through `RecipeRepositoryPort`
  - R6: each change is tested at the right level (InMemory for domain, supertest for HTTP, Playwright for user flows)
  - R7: tests delete what they create
  - R8: code matches the active OpenSpec change
- `AGENTS.md` must stay short, because it is loaded into every agent context.

### 2. `dependency-cruiser` for R1 instead of `eslint-plugin-boundaries`
- The configuration lives in `.dependency-cruiser.cjs`. It is CommonJS because the package is ESM. It sets `options.tsConfig` to `tsconfig.json` so that `.ts`-extension imports resolve.
- It defines these `forbidden` rules:
  - `domain-is-pure`: `src/backend/domain` must not depend on `application`, `infrastructure`, `frontend`, any `npm` package, or any Node `core` module.
  - `application-no-infra`: `src/backend/application` must not depend on `infrastructure`, `frontend`, `npm` packages, or `core` modules.
  - `frontend-no-backend`: `src/frontend` must not depend on `src/backend`.
- Each rule's `comment` reads "AGENTS.md R1 – …", so that the violation output names the rule (spec: Architecture Boundary Gate).
- **Why:** it is a single dev dependency with no ESLint stack, and it was built for dependency graphs.
- **Alternatives:** `eslint-plugin-boundaries` would require introducing ESLint from scratch. A custom grep script would be brittle with relative paths.

### 3. Fix the type errors without changing behavior
- Rename the unused parameters to `_fieldName` and `_title`. TypeScript exempts `_`-prefixed parameters from `noUnusedParameters`, so call sites and signatures stay the same.
- Delete the two unused test imports.
- **Why:** using `fieldName` inside `parsePositiveInteger`'s message would change a message that the spec requires and that the frontend mirrors.
- **Alternative:** remove the parameters and update every caller. That is a larger diff for the same result, and it erases the information the follow-up message fix will need.

### 4. CI runs all checks and reports them all
- `typecheck` and `check:architecture` run right after `npm ci`, before the Playwright install.
- Every check step after install uses `if: ${{ !cancelled() }}`. All gates and suites run even when an earlier one fails, so a single push shows every failure, and the job still fails if any step fails.
- The sticky comment gains two rows. It shows ✅, ❌, or ⏭️ based on the step's `outcome`, so a skipped step no longer shows as failed.
- **Why:** Actions minutes are free on this public repository, and complete feedback is worth more than failing fast.
- **Alternative:** the current fail-fast order. It hides later failures until the next push.

## Risks / Trade-offs

- [`dependency-cruiser` might not resolve `.ts`-suffixed relative imports] → Point `tsConfig` at `tsconfig.json`. Prove the gate with a temporary forbidden import that it must flag.
- [`AGENTS.md` grows and inflates every agent's context] → Keep one line of statement and one line of rationale per rule. Put examples in the review prompts of the follow-up change, not here.
- [`_`-prefixing hides a real bug in the validation message] → Record it as an explicit follow-up instead of fixing it silently here.

## Migration Plan

No data or API migration. To roll back, revert the commit. The gates are additive, and removing the two CI steps restores the previous pipeline.
