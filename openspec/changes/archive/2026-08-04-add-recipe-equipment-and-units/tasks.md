## 1. Domain Layer Updates

- [x] 1.1 Create `Equipment` domain entity in `src/backend/domain/entities/equipment.entity.ts`.
- [x] 1.2 Expand `IngredientUnit` type and runtime validator in `src/backend/domain/entities/ingredient.entity.ts`.
- [x] 1.3 Update `Recipe` aggregate root in `src/backend/domain/entities/recipe.entity.ts` to include optional equipment list.

## 2. Application & Infrastructure Layer Updates

- [x] 2.1 Update application DTOs in `src/backend/application/dtos/recipe.dto.ts` with `CreateEquipmentDto`.
- [x] 2.2 Update `JsonFileRecipeRepository` adapter in `src/backend/infrastructure/repositories/json-file-recipe.repository.ts` to serialize equipment.

## 3. Frontend UI Updates

- [x] 3.1 Update `src/frontend/services/api.service.ts` with `Equipment` type and unit choices.
- [x] 3.2 Update `src/frontend/components/RecipeForm.tsx` to add dynamic equipment inputs and unit selector.
- [x] 3.3 Update `src/frontend/components/RecipeDetail.tsx` and `src/frontend/components/RecipeGallery.tsx` to render equipment badges.

## 4. Verification & Testing

- [x] 4.1 Update unit tests in `src/backend/tests/recipe.service.spec.ts` to test expanded units and equipment validation.
- [x] 4.2 Run unit tests and verify frontend build.
