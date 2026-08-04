## Why

We are implementing the core recipe creation capability according to `recipe_creation.spec`, backed by a full-stack Hexagonal Architecture. For the MVP phase, the application runs on `localhost` with an Express REST API backend and a Mela-inspired Vite + React frontend, storing recipes in a local JSON file database on disk.

## What Changes

- **Domain Core**: Implement pure domain models (`Recipe`, `Ingredient`, `Step`), value objects (`PositiveNumber`, `StepSequence`), and domain error classes.
- **Backend (Hexagonal)**: Build an Express REST API server running on `http://localhost:3000` executing `CreateRecipeUseCase` and `ListRecipesUseCase`.
- **Local Persistence**: Implement a `JsonFileRecipeRepository` adapter reading and writing to `./data/recipes.json`.
- **User Context**: Hardcode a single default local user context (`userId: "default-local-user"`) for local MVP testing.
- **Frontend App**: Build a Vite + React + TypeScript web app running on `http://localhost:5173` featuring a Mela-inspired editorial design system for creating and viewing recipes.

## Capabilities

### New Capabilities
- `recipe-creation`: Handles domain validation, Hexagonal use case execution, REST API endpoint handler, disk JSON persistence, and React creation UI.

### Modified Capabilities

## Impact

- `src/backend/`: Hexagonal domain core, application use cases, Express HTTP server, and JSON file repository adapter.
- `src/frontend/`: React components, API integration service, and Vanilla CSS design system.
- `data/recipes.json`: Local disk file storage.
