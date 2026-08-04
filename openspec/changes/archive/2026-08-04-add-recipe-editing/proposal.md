## Why

Users need the ability to edit existing recipes to adjust ingredients, change prep times, modify instructions, or add/remove equipment prerequisites as their cooking process evolves. Supporting in-place editing directly within the recipe detail view provides a seamless UX without navigating away to a separate form.

## What Changes

- **In-Place Detail View Editing**: Toggle an inline Edit mode directly within `RecipeDetail.tsx` allowing editing of title, description, prep time, servings, equipment list, ingredients, and steps.
- **Backend Use Case**: Add `UpdateRecipeUseCase` and `UpdateRecipeService` enforcing domain invariants and title uniqueness checks upon update.
- **HTTP Endpoint**: Add `PUT /api/recipes/:id` REST API endpoint returning updated recipe payload.
- **Repository Persistence**: Implement `findById` and update persistence in `JsonFileRecipeRepository`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `recipe-creation`: Support updating existing recipes via REST API and in-place UI editing while enforcing domain invariants.

## Impact

- `src/backend/application/`: Add `UpdateRecipeUseCase` and `updateRecipe` service method.
- `src/backend/infrastructure/`: Add `PUT /api/recipes/:id` route in `recipe.controller.ts` and `server.ts`.
- `src/frontend/`: Update `api.service.ts` with `updateRecipe` and enable in-place edit mode in `RecipeDetail.tsx`.
