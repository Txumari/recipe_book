import { DeleteRecipeUseCase } from '../ports/delete-recipe.use-case.ts';
import { RecipeRepositoryPort } from '../ports/recipe-repository.port.ts';
import { RecipeNotFoundError } from '../../domain/errors/recipe-domain.error.ts';

export class DeleteRecipeService implements DeleteRecipeUseCase {
  constructor(private readonly recipeRepository: RecipeRepositoryPort) {}

  public async execute(userId: string, recipeId: string): Promise<void> {
    const deleted = await this.recipeRepository.deleteById(userId, recipeId);
    if (!deleted) {
      throw new RecipeNotFoundError(recipeId);
    }
  }
}
