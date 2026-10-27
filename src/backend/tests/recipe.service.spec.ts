import { describe, it, expect, beforeEach } from 'vitest';
import { Recipe } from '../domain/entities/recipe.entity.ts';
import { CreateRecipeService } from '../application/use-cases/create-recipe.service.ts';
import { UpdateRecipeService } from '../application/use-cases/update-recipe.service.ts';
import { DeleteRecipeService } from '../application/use-cases/delete-recipe.service.ts';
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

  public async deleteById(userId: string, id: string): Promise<boolean> {
    const initialLen = this.recipes.length;
    this.recipes = this.recipes.filter(r => !(r.userId === userId && r.id === id));
    return this.recipes.length < initialLen;
  }
}

describe('Recipe Domain & Application Services (Create, Update, Delete)', () => {
  let repo: InMemoryTestRepository;
  let createService: CreateRecipeService;
  let updateService: UpdateRecipeService;
  let deleteService: DeleteRecipeService;
  const userId = 'user-1';

  beforeEach(() => {
    repo = new InMemoryTestRepository();
    createService = new CreateRecipeService(repo);
    updateService = new UpdateRecipeService(repo);
    deleteService = new DeleteRecipeService(repo);
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
  });

  it('Scenario 3: Successful recipe deletion', async () => {
    const created = await createService.execute(userId, {
      title: 'Recipe to Delete',
      servings: 2,
      prep_time_minutes: 10,
      ingredients: [{ name: 'Water', amount: 1, unit: 'cup' as const }],
      steps: [{ step_number: 1, instruction: 'Boil' }],
    });

    await deleteService.execute(userId, created.id);
    const found = await repo.findById(userId, created.id);
    expect(found).toBeNull();
  });

  it('Scenario 4: Deleting non-existent recipe ID throws RecipeNotFoundError', async () => {
    await expect(deleteService.execute(userId, 'invalid-recipe-id')).rejects.toThrow(RecipeNotFoundError);
  });

  it('Scenario 5: Recipe creation persists a valid source_url', async () => {
    const created = await createService.execute(userId, {
      title: 'Pasta with Garlic',
      source_url: 'https://www.instagram.com/p/ABC123/',
      servings: 4,
      prep_time_minutes: 20,
      ingredients: [{ name: 'Pasta', amount: 2, unit: 'unit' as const }],
      steps: [{ step_number: 1, instruction: 'Boil pasta' }],
    });

    expect(created.source_url).toBe('https://www.instagram.com/p/ABC123/');
  });

  it('Scenario 6: Recipe creation accepts an omitted source_url (backward compatible)', async () => {
    const created = await createService.execute(userId, {
      title: 'Simple Omelette',
      servings: 2,
      prep_time_minutes: 10,
      ingredients: [{ name: 'Eggs', amount: 3, unit: 'unit' as const }],
      steps: [{ step_number: 1, instruction: 'Whisk and cook' }],
    });

    expect(created.source_url).toBeUndefined();
  });

  it('Scenario 7: Recipe creation rejects an invalid source_url protocol', async () => {
    await expect(
      createService.execute(userId, {
        title: 'Bad URL Recipe',
        source_url: 'ftp://files.example.com/recipe.txt',
        servings: 2,
        prep_time_minutes: 10,
        ingredients: [{ name: 'Water', amount: 1, unit: 'unit' as const }],
        steps: [{ step_number: 1, instruction: 'Boil' }],
      })
    ).rejects.toThrow(InvalidRecipePayloadError);
  });

  it('Scenario 8: Recipe creation rejects a malformed source_url', async () => {
    await expect(
      createService.execute(userId, {
        title: 'Malformed URL Recipe',
        source_url: 'not-a-valid-url',
        servings: 2,
        prep_time_minutes: 10,
        ingredients: [{ name: 'Water', amount: 1, unit: 'unit' as const }],
        steps: [{ step_number: 1, instruction: 'Boil' }],
      })
    ).rejects.toThrow(InvalidRecipePayloadError);
  });

  it('Scenario 9: Successful recipe update preserves source_url from the update payload', async () => {
    const created = await createService.execute(userId, {
      title: 'Gazpacho Original',
      servings: 4,
      prep_time_minutes: 15,
      ingredients: [{ name: 'Tomatoes', amount: 1, unit: 'kg' as const }],
      steps: [{ step_number: 1, instruction: 'Blend' }],
    });

    const updated = await updateService.execute(userId, created.id, {
      title: 'Gazpacho Updated',
      source_url: 'https://www.instagram.com/p/XYZ789/',
      servings: 6,
      prep_time_minutes: 20,
      ingredients: [{ name: 'Tomatoes maduros', amount: 1.5, unit: 'kg' as const }],
      steps: [{ step_number: 1, instruction: 'Blend tomatoes with olive oil' }],
    });

    expect(updated.source_url).toBe('https://www.instagram.com/p/XYZ789/');
  });
});
