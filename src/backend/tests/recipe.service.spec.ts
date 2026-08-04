import { describe, it, expect, beforeEach } from 'vitest';
import { Recipe } from '../domain/entities/recipe.entity.ts';
import { CreateRecipeService } from '../application/use-cases/create-recipe.service.ts';
import { RecipeRepositoryPort } from '../application/ports/recipe-repository.port.ts';
import { InvalidRecipePayloadError, DuplicateRecipeTitleError } from '../domain/errors/recipe-domain.error.ts';

class InMemoryTestRepository implements RecipeRepositoryPort {
  private recipes: Recipe[] = [];

  public async save(recipe: Recipe): Promise<Recipe> {
    this.recipes.push(recipe);
    return recipe;
  }

  public async findByTitle(userId: string, title: string): Promise<Recipe | null> {
    return this.recipes.find(r => r.userId === userId && r.title.toLowerCase() === title.toLowerCase()) || null;
  }

  public async findAll(userId: string): Promise<Recipe[]> {
    return this.recipes.filter(r => r.userId === userId);
  }
}

describe('Recipe Creation Domain & Service (Equipment & Expanded Units)', () => {
  let repo: InMemoryTestRepository;
  let service: CreateRecipeService;
  const userId = 'user-1';

  beforeEach(() => {
    repo = new InMemoryTestRepository();
    service = new CreateRecipeService(repo);
  });

  it('Scenario 1: Recipe creation with expanded units and equipment list', async () => {
    const validPayload = {
      title: 'Bizcocho de Limon',
      description: 'Fluffy lemon cake',
      servings: 8,
      prep_time_minutes: 45,
      equipment: [
        { name: 'Molde redondo', specification: '20 cm de diametro', is_optional: false },
        { name: 'Varillas electricas', is_optional: true },
      ],
      ingredients: [
        { name: 'Harina', amount: 0.25, unit: 'kg' as const },
        { name: 'Azucar', amount: 1, unit: 'cup' as const },
        { name: 'Sal', amount: 1, unit: 'pinch' as const },
        { name: 'Huevos', amount: 3, unit: 'unit' as const },
        { name: 'Aceite', amount: 1, unit: 'splash' as const },
      ],
      steps: [
        { step_number: 1, instruction: 'Preheat oven to 180C.' },
        { step_number: 2, instruction: 'Mix ingredients and pour into 20 cm mold.' },
      ],
    };

    const recipe = await service.execute(userId, validPayload);

    expect(recipe).toBeDefined();
    expect(recipe.title).toBe('Bizcocho de Limon');
    expect(recipe.equipment.length).toBe(2);
    expect(recipe.equipment[0].name).toBe('Molde redondo');
    expect(recipe.equipment[0].specification).toBe('20 cm de diametro');
    expect(recipe.ingredients.length).toBe(5);
    expect(recipe.ingredients[0].unit).toBe('kg');
    expect(recipe.ingredients[2].unit).toBe('pinch');
    expect(recipe.ingredients[4].unit).toBe('splash');
  });

  it('Scenario 2: Reject creation with empty equipment name', async () => {
    const invalidEquipmentPayload = {
      title: 'Invalid Equipment Recipe',
      servings: 2,
      prep_time_minutes: 10,
      equipment: [{ name: '   ' }],
      ingredients: [{ name: 'Water', amount: 1, unit: 'cup' as const }],
      steps: [{ step_number: 1, instruction: 'Boil water' }],
    };

    await expect(service.execute(userId, invalidEquipmentPayload as any)).rejects.toThrow(
      'Equipment name cannot be empty.'
    );
  });

  it('Scenario 3: Reject creation with unsupported ingredient unit', async () => {
    const invalidUnitPayload = {
      title: 'Invalid Unit Recipe',
      servings: 2,
      prep_time_minutes: 10,
      ingredients: [{ name: 'Flour', amount: 100, unit: 'unknown_unit' as any }],
      steps: [{ step_number: 1, instruction: 'Mix flour' }],
    };

    await expect(service.execute(userId, invalidUnitPayload as any)).rejects.toThrow(
      InvalidRecipePayloadError
    );
  });
});
