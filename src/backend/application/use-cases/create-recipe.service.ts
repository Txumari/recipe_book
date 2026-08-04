import { CreateRecipeUseCase } from '../ports/create-recipe.use-case.ts';
import { RecipeRepositoryPort } from '../ports/recipe-repository.port.ts';
import { CreateRecipeDto } from '../dtos/recipe.dto.ts';
import { Recipe } from '../../domain/entities/recipe.entity.ts';
import { DuplicateRecipeTitleError } from '../../domain/errors/recipe-domain.error.ts';

export class CreateRecipeService implements CreateRecipeUseCase {
  constructor(private readonly recipeRepository: RecipeRepositoryPort) {}

  public async execute(userId: string, dto: CreateRecipeDto): Promise<Recipe> {
    // 1. Create domain entity (this automatically runs all invariant validations)
    const recipe = Recipe.create({
      userId,
      title: dto.title,
      description: dto.description,
      servings: dto.servings,
      prep_time_minutes: dto.prep_time_minutes,
      equipment: dto.equipment,
      ingredients: dto.ingredients,
      steps: dto.steps,
    });

    // 2. Check title uniqueness for the current user
    const existing = await this.recipeRepository.findByTitle(userId, recipe.title);
    if (existing) {
      throw new DuplicateRecipeTitleError(recipe.title);
    }

    // 3. Save and return recipe domain object
    return await this.recipeRepository.save(recipe);
  }
}
