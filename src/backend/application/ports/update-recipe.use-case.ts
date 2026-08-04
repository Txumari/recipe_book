import { CreateRecipeDto } from '../dtos/recipe.dto.ts';
import { Recipe } from '../../domain/entities/recipe.entity.ts';

export interface UpdateRecipeUseCase {
  execute(userId: string, recipeId: string, dto: CreateRecipeDto): Promise<Recipe>;
}
