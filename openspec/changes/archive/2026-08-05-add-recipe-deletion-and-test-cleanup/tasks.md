## 1. Domain & Application Layer Updates

- [x] 1.1 Add `deleteById` method to `RecipeRepositoryPort` and implement in `JsonFileRecipeRepository`.
- [x] 1.2 Create `DeleteRecipeUseCase` port interface in `src/backend/application/ports/delete-recipe.use-case.ts`.
- [x] 1.3 Implement `DeleteRecipeService` in `src/backend/application/use-cases/delete-recipe.service.ts`.

## 2. Infrastructure Layer Updates

- [x] 2.1 Add `deleteRecipe` method to Express `RecipeController` in `src/backend/infrastructure/http/recipe.controller.ts`.
- [x] 2.2 Register `DELETE /api/recipes/:id` endpoint in `src/backend/infrastructure/http/server.ts`.

## 3. Frontend UI Updates

- [x] 3.1 Add `deleteRecipe(id)` function to `src/frontend/services/api.service.ts`.
- [x] 3.2 Create `ConfirmModal.tsx` confirmation dialog component in `src/frontend/components/ConfirmModal.tsx`.
- [x] 3.3 Add Delete action buttons with modal confirmation in `src/frontend/components/RecipeDetail.tsx` and `src/frontend/components/RecipeGallery.tsx`.

## 4. Test Suite Teardown & Verification

- [x] 4.1 Add unit tests for `DeleteRecipeService` in `src/backend/tests/recipe.service.spec.ts`.
- [x] 4.2 Add Supertest integration tests for `DELETE /api/recipes/:id` and teardown hooks in `src/backend/tests/server.spec.ts`.
- [x] 4.3 Add Playwright E2E deletion test & cleanup hook in `e2e/recipe-editing.spec.ts`.
- [x] 4.4 Run unit, integration, and E2E tests, and verify Vite production build.
