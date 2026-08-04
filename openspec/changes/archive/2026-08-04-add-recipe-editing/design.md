## Context

See proposal.md for motivation and `specs/recipe-creation/spec.md` for requirements.
The system uses Hexagonal Architecture with `RecipeRepositoryPort` and Express REST routes.

## Goals / Non-Goals

**Goals:**
- Add `findById(userId, id)` method to `RecipeRepositoryPort` and `JsonFileRecipeRepository`.
- Implement `UpdateRecipeUseCase` and `UpdateRecipeService` verifying existing recipe presence and validating title collisions against *other* recipes.
- Add `PUT /api/recipes/:id` endpoint in `RecipeController` and `server.ts`.
- Implement in-place Edit Mode inside `RecipeDetail.tsx` with Save/Cancel inline action buttons.
- Update `api.service.ts` with `updateRecipe(id, dto)`.

**Non-Goals:**
- Navigating back to `RecipeForm` for editing (editing is strictly in-place within `RecipeDetail`).

## Decisions

### 1. Title Uniqueness Exclusion for Self-Updates
- **Decision:** When executing `UpdateRecipeService`, check title collision using `findByTitle(userId, newTitle)`. If a recipe is found with the same title BUT a different ID, throw `DuplicateRecipeTitleError`. If the ID matches, allow the update.
- **Rationale:** Prevents a recipe from blocking its own update when the user edits non-title fields (e.g., adding an ingredient).

### 2. In-Place Editing Component State in `RecipeDetail.tsx`
- **Decision:** Manage `isEditing` state inside `RecipeDetail.tsx`. When `isEditing` is true, render inline input fields for title, description, prep time, servings, equipment list, ingredients, and step sequence directly in place.
- **Rationale:** Satisfies the user requirement for in-place detail view editing while preserving original creation timestamp and ID.

## Risks / Trade-offs

- [Risk] User cancels edit mode after making changes.
  → [Mitigation] Reset internal form state back to original recipe props upon clicking "Cancel Editing".
