## Context

See `proposal.md` for motivation and `specs/recipe-creation/spec.md` for requirements.
This design establishes a full-stack architecture for local MVP operation on `localhost`.

## Goals / Non-Goals

**Goals:**
- Implement Hexagonal Architecture (Ports & Adapters) for the backend domain model.
- Provide an Express REST API backend server running on `http://localhost:3000`.
- Provide a `JsonFileRecipeRepository` secondary adapter saving recipes to `./data/recipes.json`.
- Provide a single local user context (`default-local-user`) for local testing.
- Build a Vite + React + TypeScript web app on `http://localhost:5173` with a Mela-inspired editorial UI.

**Non-Goals:**
- Production SQL database setup (Postgres/MySQL) or OAuth server setup for MVP.
- Cloud deployment pipelines (focus strictly on `localhost` dev setup).

## Decisions

### 1. Hexagonal Backend Architecture
- **Decision:** Separate `domain/` (pure entities, value objects, domain errors), `application/` (use cases, DTOs, ports), and `infrastructure/` (Express HTTP controllers, JSON file repo).
- **Rationale:** Keeps business logic 100% testable and completely independent of Express or disk file storage.

### 2. Local JSON File Database Adapter
- **Decision:** Implement `JsonFileRecipeRepository` implementing `RecipeRepositoryPort` to store data in `./data/recipes.json`.
- **Rationale:** Ensures recipes persist across localhost server restarts without requiring database daemon setup.

### 3. Vite + React Frontend with Mela Aesthetic
- **Decision:** Build the frontend using Vite, React, TypeScript, and Vanilla CSS with CSS custom properties (variables) for dark/light themes, card elevation, and clean typography.
- **Rationale:** Provides rapid HMR dev experience and scalable component structure matching Mela's design quality.

## Risks / Trade-offs

- [Risk] Concurrent file writes to `./data/recipes.json` could cause race conditions.
  → [Mitigation] Use atomic file writing or synchronous file lock queue in the file repository adapter.
