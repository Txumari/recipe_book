import { describe, it, expect, beforeEach } from 'vitest';
import { Recipe } from '../domain/entities/recipe.entity.ts';
import { CreateRecipeService } from '../application/use-cases/create-recipe.service.ts';
import { UpdateRecipeService } from '../application/use-cases/update-recipe.service.ts';
import { RecipeRepositoryPort } from '../application/ports/recipe-repository.port.ts';
import { InvalidRecipePayloadError, DuplicateRecipeTitleError, RecipeNotFoundError } from '../domain/errors/recipe-domain.error.ts';

class InMemoryTestRepository implements RecipeRepositoryPort {
  private recipes: Recipe[] = [];

  public async save(recipe: Recipe): Promise<Recipe> {
    const idx = this.recipes.findIndex(r => r.id === recipe.id);
    if (idx >= 0) {
      this.recipes[idx] = recipe;
    } else {
      this.recipes.push(recipe);
    }
    return recipe;
  }

  public async findById(userId: string, id: string): Promise<Recipe | null> {
    return this.recipes.find(r => r.userId === userId && r.id === id) || null;
  }

  public async findByTitle(userId: string, title: string): Promise<Recipe | null> {
    return this.recipes.find(r => r.userId === userId && r.title.toLowerCase() === title.toLowerCase()) || null;
  }

  public async findAll(userId: string): Promise<Recipe[]> {
    return this.recipes.filter(r => r.userId === userId);
  }
}

describe('Recipe Creation & Update Domain & Service', () => {
  let repo: InMemoryTestRepository;
  let createService: CreateRecipeService;
  let updateService: UpdateRecipeService;
  const userId = 'user-1';

  beforeEach(() => {
    repo = new InMemoryTestRepository();
    createService = new CreateRecipeService(repo);
    updateService = new UpdateRecipeService(repo);
  });

  it('Scenario 1: Recipe creation with equipment & expanded units', async () => {
    const validPayload = {
      title: 'Bizcocho de Limon',
      servings: 8,
      prep_time_minutes: 45,
      equipment: [{ name: 'Molde redondo', specification: '20 cm' }],
      ingredients: [{ name: 'Harina', amount: 0.25, unit: 'kg' as const }],
      steps: [{ step_number: 1, instruction: 'Bake at 180C' }],
    };

    const recipe = await createService.execute(userId, validPayload);
    expect(recipe.title).toBe('Bizcocho de Limon');
    expect(recipe.equipment.length).toBe(1);
  });

  it('Scenario 2: Successful recipe update', async () => {
    const created = await createService.execute(userId, {
      title: 'Gazpacho',
      servings: 4,
      prep_time_minutes: 15,
      ingredients: [{ name: 'Tomates', amount: 1, unit: 'kg' as const }],
      steps: [{ step_number: 1, instruction: 'Blend' }],
    });

    const updated = await updateService.execute(userId, created.id, {
      title: 'Gazpacho Andaluz Tradicional',
      servings: 6,
      prep_time_minutes: 20,
      equipment: [{ name: 'Batidora de vaso' }],
      ingredients: [{ name: 'Tomates maduros', amount: 1.5, unit: 'kg' as const }],
      steps: [{ step_number: 1, instruction: 'Blend tomatoes with olive oil' }],
    });

    expect(updated.id).toBe(created.id);
    expect(updated.title).toBe('Gazpacho Andaluz Tradicional');
    expect(updated.servings).toBe(6);
    expect(updated.equipment[0].name).toBe('Batidora de vaso');
  });

  it('Scenario 3: Updating non-existent recipe ID throws RecipeNotFoundError', async () => {
    await expect(updateService.execute(userId, 'non-existent-id', {
      title: 'Test',
      servings: 2,
      prep_time_minutes: 10,
      ingredients: [{ name: 'Water', amount: 1, unit: 'cup' as const }],
      steps: [{ step_number: 1, instruction: 'Boil' }],
    })).rejects.toThrow(RecipeNotFoundError);
  });

  it('Scenario 4: Updating self-title succeeds without collision error', async () => {
    const created = await createService.execute(userId, {
      title: 'Paella Valenciana',
      servings: 4,
      prep_time_minutes: 40,
      ingredients: [{ name: 'Rice', amount: 400, unit: 'grams' as const }],
      steps: [{ step_number: 1, instruction: 'Cook rice' }],
    });

    const updated = await updateService.execute(userId, created.id, {
      title: 'Paella Valenciana', // Same title
      description: 'Added description',
      servings: 6,
      prep_time_minutes: 45,
      ingredients: [{ name: 'Rice', amount: 600, unit: 'grams' as const }],
      steps: [{ step_number: 1, instruction: 'Cook rice slowly' }],
    });

    expect(updated.servings).toBe(6);
    expect(updated.description).toBe('Added description');
  });

  it('Scenario 5: Updating title to another existing recipe title throws DuplicateRecipeTitleError', async () => {
    await createService.execute(userId, {
      title: 'Recipe A',
      servings: 2,
      prep_time_minutes: 10,
      ingredients: [{ name: 'A', amount: 1, unit: 'unit' as const }],
      steps: [{ step_number: 1, instruction: 'A' }],
    });

    const recipeB = await createService.execute(userId, {
      title: 'Recipe B',
      servings: 2,
      prep_time_minutes: 10,
      ingredients: [{ name: 'B', amount: 1, unit: 'unit' as const }],
      steps: [{ step_number: 1, instruction: 'B' }],
    });

    // Try updating Recipe B's title to "Recipe A"
    await expect(updateService.execute(userId, recipeB.id, {
      title: 'Recipe A',
      servings: 2,
      prep_time_minutes: 10,
      ingredients: [{ name: 'B', amount: 1, unit: 'unit' as const }],
      steps: [{ step_number: 1, instruction: 'B' }],
    })).rejects.toThrow(DuplicateRecipeTitleError);
  });
});
