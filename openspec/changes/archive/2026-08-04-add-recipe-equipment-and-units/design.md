## Context

See proposal.md for motivation and `specs/recipe-creation/spec.md` for requirements.
The existing Hexagonal Architecture splits the project into backend domain (`src/backend/domain`), application use cases (`src/backend/application`), infrastructure storage/REST controllers (`src/backend/infrastructure`), and React UI components (`src/frontend`).

## Goals / Non-Goals

**Goals:**
- Create an `Equipment` domain entity (`name`, `specification`, `is_optional`).
- Update `Recipe` aggregate root and `CreateRecipeDto` to support optional equipment lists.
- Expand `IngredientUnit` type in `ingredient.entity.ts` to include metric mass (`grams`, `kg`), metric volume (`ml`, `l`), culinary measures (`tbsp`, `tsp`, `cup`, `pinch`), and descriptive units (`unit`, `clove`, `slice`, `splash`).
- Update `JsonFileRecipeRepository` to serialize and restore equipment arrays.
- Update `RecipeForm` React component with dynamic equipment management and unit selector dropdown.
- Update `RecipeDetail` and `RecipeGallery` React components to render equipment badges in Mela UI style.

**Non-Goals:**
- Unit conversion engine (e.g. converting 1 kg to 1000 grams automatically during serving scaling) for this iteration.

## Decisions

### 1. Structured Equipment Domain Entity
- **Decision:** Implement `Equipment` entity (`name: string`, `specification?: string`, `is_optional: boolean`).
- **Rationale:** Captures tool prerequisites (e.g. "Molde para bizcocho", "20 cm de diámetro") distinctly from step instructions, enabling equipment badges in UI and future tool filtering.

### 2. Runtime Validation for Expanded Units
- **Decision:** Maintain a central `VALID_INGREDIENT_UNITS` array and validate all incoming ingredient unit strings at runtime in `ingredient.entity.ts`.
- **Rationale:** Keeps unit checking strict and explicit across REST API payloads while expanding support for real-world cooking measurements.

## Risks / Trade-offs

- [Risk] Legacy saved recipes in `./data/recipes.json` might lack the `equipment` property.
  → [Mitigation] Default `equipment` to `[]` when reading JSON entries without equipment array.
