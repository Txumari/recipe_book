## 1. Domain & Application Layer Updates

- [x] 1.1 Add `findById` method to `RecipeRepositoryPort` and implement in `JsonFileRecipeRepository`.
- [x] 1.2 Create `UpdateRecipeUseCase` port interface in `src/backend/application/ports/update-recipe.use-case.ts`.
- [x] 1.3 Implement `UpdateRecipeService` in `src/backend/application/use-cases/update-recipe.service.ts` with title collision check and domain re-validation.

## 2. Infrastructure Layer Updates

- [x] 2.1 Add `updateRecipe` method to Express `RecipeController` in `src/backend/infrastructure/http/recipe.controller.ts`.
- [x] 2.2 Register `PUT /api/recipes/:id` endpoint in `src/backend/infrastructure/http/server.ts`.

## 3. Frontend In-Place UI Updates

- [x] 3.1 Add `updateRecipe(id, dto)` function to `src/frontend/services/api.service.ts`.
- [x] 3.2 Implement inline `isEditing` mode inside `src/frontend/components/RecipeDetail.tsx` enabling in-place editing of all recipe attributes.

## 4. Verification & Testing

- [x] 4.1 Write unit tests for recipe update scenarios (successful update, self-title update, title collision, non-existent recipe ID) in `src/backend/tests/recipe.service.spec.ts`.
- [x] 4.2 Run unit tests and verify Vite frontend build.
