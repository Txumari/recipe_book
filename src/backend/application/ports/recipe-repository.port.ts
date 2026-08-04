import { Recipe } from '../../domain/entities/recipe.entity.ts';

export interface RecipeRepositoryPort {
  save(recipe: Recipe): Promise<Recipe>;
  findByTitle(userId: string, title: string): Promise<Recipe | null>;
  findAll(userId: string): Promise<Recipe[]>;
}
