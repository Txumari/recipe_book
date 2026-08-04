## Why

Real-world cooking requires specific kitchen equipment (e.g. "20 cm cake mold", "high-speed blender") and diverse culinary measurement units (e.g. teaspoons, cups, pinches, cloves, slices, splashes). Adding structured equipment metadata and expanding unit validation enables cooks to prepare required tools before cooking and express precise recipe quantities.

## What Changes

- **Equipment Prerequisites**: Add an optional `equipment` property to recipes containing structured equipment objects (`name`, `specification`, `is_optional`).
- **Expanded Measurement Units**: Extend `IngredientUnit` validation to support metric mass (`grams`, `kg`), metric volume (`ml`, `l`), household culinary units (`tbsp`, `tsp`, `cup`, `pinch`), and descriptive units (`unit`, `clove`, `slice`, `splash`).
- **Full-Stack Updates**: Update backend Hexagonal domain models, DTOs, Express REST API, JSON repository serializer, and React creation/viewing UI components.

## Capabilities

### New Capabilities

### Modified Capabilities
- `recipe-creation`: Expand ingredient measurement units and add kitchen equipment domain validation & storage.

## Impact

- `src/backend/domain/`: Add `equipment.entity.ts`, expand `IngredientUnit` type, and update `Recipe` aggregate root.
- `src/backend/application/`: Update `CreateRecipeDto` and REST API payloads to handle `equipment`.
- `src/backend/infrastructure/`: Update `JsonFileRecipeRepository` to serialize and restore equipment.
- `src/frontend/`: Update `RecipeForm` to add/remove equipment items dynamically, and update `RecipeDetail` / `RecipeGallery` to render equipment badges in Mela UI style.
