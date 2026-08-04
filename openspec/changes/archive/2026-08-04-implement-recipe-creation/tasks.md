## 1. Project & Build Environment Setup

- [x] 1.1 Configure `package.json` with dependencies for Express, TypeScript, Vite, React, and dev tools.
- [x] 1.2 Setup TypeScript configuration (`tsconfig.json`) and project directory layout (`src/backend`, `src/frontend`).

## 2. Backend Domain & Application Core (Hexagonal)

- [x] 2.1 Implement domain errors (`RecipeDomainError`, `InvalidRecipePayloadError`, `DuplicateRecipeTitleError`) in `src/backend/domain/errors/`.
- [x] 2.2 Implement value objects (`PositiveNumber`, `StepSequence`) in `src/backend/domain/value-objects/`.
- [x] 2.3 Implement domain entities (`Ingredient`, `Step`, `Recipe`) in `src/backend/domain/entities/`.
- [x] 2.4 Define application DTOs and ports (`RecipeRepositoryPort`, `CreateRecipeUseCase`) in `src/backend/application/`.
- [x] 2.5 Implement `CreateRecipeService` use case orchestrating domain creation and repository check.

## 3. Infrastructure Layer (Express REST API & Disk Storage)

- [x] 3.1 Implement `JsonFileRecipeRepository` adapter reading and writing `./data/recipes.json`.
- [x] 3.2 Implement Express HTTP controller (`POST /api/recipes`, `GET /api/recipes`) and server setup running on `http://localhost:3000`.

## 4. Frontend Web Application (Mela-inspired React UI)

- [x] 4.1 Create Vanilla CSS design system with curated color palette, typography, micro-animations, and card layouts in `src/frontend/styles/`.
- [x] 4.2 Create API client service in `src/frontend/services/api.service.ts`.
- [x] 4.3 Build Mela-style Recipe Creation Form component with dynamic ingredient & step inputs.
- [x] 4.4 Build Recipe Gallery & Detail components showing recipe cards, scaled servings, and step checklists.
- [x] 4.5 Wire up main React application root and dev runner on `http://localhost:5173`.

## 5. Verification & Testing

- [x] 5.1 Write unit tests for domain entities, value objects, and `CreateRecipeService`.
- [x] 5.2 Test end-to-end recipe creation from React UI on `http://localhost:5173` through Express backend to `./data/recipes.json`.
