# code-quality-gates Specification

## Purpose

Defines the documented project rules and the deterministic static checks that enforce the mechanical ones, locally and in CI, so that rule violations block a merge before any human or AI review.

## Requirements

### Requirement: Documented Project Rules
The repository SHALL contain a provider-neutral `AGENTS.md` at its root that lists every project rule with a stable identifier (R1, R2, …) and a one-line rationale. `CLAUDE.md` SHALL import `AGENTS.md` rather than duplicate its rules.

#### Scenario: Rules are discoverable by identifier
- **WHEN** a contributor or AI agent opens `AGENTS.md`
- **THEN** each rule MUST appear with a unique identifier, a statement, and a rationale, covering at least layer boundaries, domain invariants, value objects, domain errors, use-case/port pairing, test levels, test teardown, and OpenSpec conformance

#### Scenario: Claude loads the shared rules
- **WHEN** Claude Code starts in the repository
- **THEN** `CLAUDE.md` MUST reference `AGENTS.md` through an import so the same rules are loaded without being copied

### Requirement: Type-Check Gate
The project SHALL provide a `typecheck` npm script that type-checks all TypeScript sources under `src/` using the repository `tsconfig.json` without emitting output, exiting non-zero on any type error.

#### Scenario: Clean codebase passes
- **WHEN** `npm run typecheck` runs on the main branch after this change
- **THEN** it MUST exit with status 0 and report no errors

#### Scenario: Type error fails the gate
- **WHEN** a source file under `src/` contains a type error or an unused local or parameter
- **THEN** `npm run typecheck` MUST exit non-zero and report the file and line

### Requirement: Architecture Boundary Gate
The project SHALL provide a `check:architecture` npm script that fails when an import crosses a forbidden layer boundary: `domain` importing `application`, `infrastructure`, or Node/HTTP framework modules; `application` importing `infrastructure` or framework modules; `frontend` importing `backend`.

#### Scenario: Compliant imports pass
- **WHEN** `npm run check:architecture` runs on a codebase where every import respects the layer rules
- **THEN** it MUST exit with status 0

#### Scenario: Forbidden import fails with rule reference
- **WHEN** a file under `src/backend/domain/` imports from `src/backend/infrastructure/` or from `express`
- **THEN** `npm run check:architecture` MUST exit non-zero and its output MUST name the offending file, the imported module, and the violated rule identifier from `AGENTS.md`

### Requirement: Gates Enforced in CI
The CI workflow SHALL run the type-check gate and the architecture boundary gate on every push and pull request to `main`, and the job SHALL fail when either gate fails.

#### Scenario: Gate failure blocks the pipeline
- **WHEN** a pull request introduces a type error or a forbidden import
- **THEN** the CI job MUST finish with a failed status

#### Scenario: Gate results in sticky comment
- **WHEN** CI runs for a pull request
- **THEN** the sticky results comment MUST include one row for the type-check gate and one row for the architecture gate, each showing passed or failed
