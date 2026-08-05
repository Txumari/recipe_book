## Why

Users need the ability to remove unwanted or outdated recipes from their cookbook. Furthermore, test suites (Supertest & Playwright E2E) need a clean deletion mechanism to tear down test-created recipes after execution, keeping `./data/recipes.json` clean and preventing data pollution.

## What Changes

- **Backend Deletion Use Case & REST Endpoint**: Implement `DeleteRecipeUseCase` primary port, `deleteById` in `JsonFileRecipeRepository`, and expose `DELETE /api/recipes/:id` REST API endpoint returning `204 No Content` on success or `404 Not Found`.
- **UI Delete Entry Points & Confirmation Modal**: Add Delete action buttons in both `RecipeDetail.tsx` and `RecipeGallery.tsx` cards, gated behind an explicit Confirmation Dialog ("Are you sure you want to delete '[Title]'?").
- **Test Suite Teardown Cleanup**: Update Supertest integration tests (`server.spec.ts`) and Playwright E2E tests (`recipe-editing.spec.ts`) to call `DELETE /api/recipes/:id` in teardown hooks (`afterEach`/`afterAll`), maintaining clean disk storage after test runs.

## Capabilities

### New Capabilities

### Modified Capabilities
- `recipe-creation`: Add recipe deletion support via REST API and UI with mandatory confirmation, and mandate test teardown cleanup.

## Impact

- `src/backend/`: Add `DeleteRecipeUseCase`, `deleteRecipe` controller method, and `DELETE /api/recipes/:id` route.
- `src/frontend/`: Add `deleteRecipe` in `api.service.ts`, reusable Confirmation Modal, and delete buttons in `RecipeGallery` and `RecipeDetail`.
- `src/backend/tests/` & `e2e/`: Add cleanup hooks to delete test recipes after test execution.
