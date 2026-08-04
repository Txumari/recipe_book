import { Recipe } from '../../domain/entities/recipe.entity.ts';

export interface RecipeRepositoryPort {
  save(recipe: Recipe): Promise<Recipe>;
  findById(userId: string, id: string): Promise<Recipe | null>;
  findByTitle(userId: string, title: string): Promise<Recipe | null>;
  findAll(userId: string): Promise<Recipe[]>;
}
