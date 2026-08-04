import { CreateRecipeDto } from '../dtos/recipe.dto.ts';
import { Recipe } from '../../domain/entities/recipe.entity.ts';

export interface CreateRecipeUseCase {
  execute(userId: string, dto: CreateRecipeDto): Promise<Recipe>;
}
