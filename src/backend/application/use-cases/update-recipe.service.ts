import { UpdateRecipeUseCase } from '../ports/update-recipe.use-case.ts';
import { RecipeRepositoryPort } from '../ports/recipe-repository.port.ts';
import { CreateRecipeDto } from '../dtos/recipe.dto.ts';
import { Recipe } from '../../domain/entities/recipe.entity.ts';
import { DuplicateRecipeTitleError, RecipeNotFoundError } from '../../domain/errors/recipe-domain.error.ts';

export class UpdateRecipeService implements UpdateRecipeUseCase {
  constructor(private readonly recipeRepository: RecipeRepositoryPort) {}

  public async execute(userId: string, recipeId: string, dto: CreateRecipeDto): Promise<Recipe> {
    // 1. Verify existing recipe exists
    const existing = await this.recipeRepository.findById(userId, recipeId);
    if (!existing) {
      throw new RecipeNotFoundError(recipeId);
    }

    // 2. Check title collision against OTHER recipes owned by the user
    const existingWithTitle = await this.recipeRepository.findByTitle(userId, dto.title);
    if (existingWithTitle && existingWithTitle.id !== recipeId) {
      throw new DuplicateRecipeTitleError(dto.title);
    }

    // 3. Re-create domain entity (runs all invariant validations & preserves original ID and createdAt)
    const updatedRecipe = Recipe.create({
      id: recipeId,
      userId,
      title: dto.title,
      description: dto.description,
      source_url: dto.source_url,
      servings: dto.servings,
      prep_time_minutes: dto.prep_time_minutes,
      equipment: dto.equipment,
      ingredients: dto.ingredients,
      steps: dto.steps,
      createdAt: existing.createdAt,
    });

    // 4. Persist updated recipe
    return await this.recipeRepository.save(updatedRecipe);
  }
}
