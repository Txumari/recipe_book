# AGENTS.md

Project rules for humans and AI agents working on this repository. Each rule has a stable ID; reviews and tooling cite these IDs. Keep this file short — it is loaded into every agent's context.

**Stack:** TypeScript (strict), Express backend with hexagonal architecture under `src/backend/{domain,application,infrastructure}`, React + Vite frontend under `src/frontend`, Vitest + Supertest + Playwright tests, OpenSpec for change planning (`openspec/`).

## Rules

- **R1 — Layer boundaries.** `domain` imports only `domain`; `application` imports only `domain` and itself; only `infrastructure` may use Express, `fs`, `path` or other packages; `frontend` never imports `backend`.
  *Why:* keeps business logic framework-free and testable in memory.
  *Enforced by:* `npm run check:architecture` (CI fails on violation). Type errors are caught separately by `npm run typecheck`.
- **R2 — Entities guard their invariants.** Entities use a private constructor plus `static create()`, and all domain validation lives there — never in controllers, DTOs or the UI only.
  *Why:* one place to enforce rules; every entry point gets them for free.
- **R3 — Validated primitives are branded value objects.** Constrained values (e.g. `PositiveInteger`) are parsed once in `domain/value-objects` and carried as branded types.
  *Why:* the type system proves a value was validated.
- **R4 — Business errors are domain errors.** Every business failure throws a subclass of `RecipeDomainError`; `infrastructure/http` maps each subclass to an HTTP status (e.g. not found → 404, duplicate → 409, invalid → 400).
  *Why:* the domain stays HTTP-agnostic and clients get consistent status codes.
- **R5 — Use cases are port + service.** Each use case has an interface in `application/ports` and an implementation in `application/use-cases`; persistence changes go through `RecipeRepositoryPort`.
  *Why:* adapters depend on abstractions and can be swapped in tests.
- **R6 — Test at the right level.** Domain/use-case logic → Vitest with an in-memory repository; HTTP routes and status codes → Supertest; user-visible flows → Playwright.
  *Why:* a past bug slipped through because only unit tests covered an HTTP flow.
- **R7 — Tests clean up after themselves.** Integration and E2E tests delete every recipe they create in teardown hooks.
  *Why:* leftover data in `data/recipes.json` causes title collisions between runs.
- **R8 — Code follows its OpenSpec change.** Behavior changes come with an OpenSpec change; the diff implements its requirements and scenarios, checked tasks are actually done, and nothing out of scope slips in.
  *Why:* specs are the source of truth for what the system does.
