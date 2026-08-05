export interface DeleteRecipeUseCase {
  execute(userId: string, recipeId: string): Promise<void>;
}
