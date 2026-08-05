## Context

See proposal.md for motivation and `specs/recipe-creation/spec.md` for requirements.

## Goals / Non-Goals

**Goals:**
- Add `deleteById` signature to `RecipeRepositoryPort` and implement in `JsonFileRecipeRepository`.
- Create `DeleteRecipeUseCase` port and `DeleteRecipeService` application service.
- Expose `DELETE /api/recipes/:id` endpoint in `RecipeController` returning 204 No Content on success or 404 Not Found.
- Create reusable `ConfirmModal.tsx` component in React frontend.
- Add Delete buttons with modal confirmation to `RecipeDetail.tsx` and `RecipeGallery.tsx`.
- Update `server.spec.ts` (Supertest) and `recipe-editing.spec.ts` (Playwright) to issue `DELETE /api/recipes/:id` during test teardown.

**Non-Goals:**
- Soft-delete or archive status (hard deletion from repository storage).

## Decisions

### 1. Reusable Confirmation Modal Component
- **Decision:** Build `ConfirmModal.tsx` accepting `isOpen`, `title`, `message`, `confirmText`, `onConfirm`, and `onCancel`.
- **Rationale:** Ensures consistent, accessible confirmation behavior across both the gallery cards and detail view.

### 2. Test Suite Teardown Hooks
- **Decision:** In `server.spec.ts` and `recipe-editing.spec.ts`, track created test recipe IDs and delete them in `afterEach`/`afterAll` teardown hooks.
- **Rationale:** Keeps `./data/recipes.json` clean, eliminating disk storage pollution and title collision issues across repeated test runs.

## Risks / Trade-offs

- [Risk] User accidentally deletes a recipe.
  → [Mitigation] Mandatory confirmation dialog with red warning buttons before making the DELETE network call.
