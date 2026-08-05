import { Request, Response } from 'express';
import { CreateRecipeService } from '../../application/use-cases/create-recipe.service.ts';
import { UpdateRecipeService } from '../../application/use-cases/update-recipe.service.ts';
import { DeleteRecipeService } from '../../application/use-cases/delete-recipe.service.ts';
import { RecipeRepositoryPort } from '../../application/ports/recipe-repository.port.ts';
import { RecipeDomainError, DuplicateRecipeTitleError, RecipeNotFoundError } from '../../domain/errors/recipe-domain.error.ts';

export class RecipeController {
  constructor(
    private readonly createRecipeService: CreateRecipeService,
    private readonly updateRecipeService: UpdateRecipeService,
    private readonly deleteRecipeService: DeleteRecipeService,
    private readonly recipeRepository: RecipeRepositoryPort
  ) {}

  public async createRecipe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.headers['x-user-id'] as string) || 'default-local-user';
      const recipe = await this.createRecipeService.execute(userId, req.body);
      res.status(201).json(recipe);
    } catch (error: any) {
      if (error instanceof DuplicateRecipeTitleError) {
        res.status(409).json({ error: error.message });
      } else if (error instanceof RecipeDomainError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error: ' + error?.message });
      }
    }
  }

  public async updateRecipe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.headers['x-user-id'] as string) || 'default-local-user';
      const recipeId = req.params.id;
      const updated = await this.updateRecipeService.execute(userId, recipeId, req.body);
      res.status(200).json(updated);
    } catch (error: any) {
      if (error instanceof RecipeNotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof DuplicateRecipeTitleError) {
        res.status(409).json({ error: error.message });
      } else if (error instanceof RecipeDomainError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error: ' + error?.message });
      }
    }
  }

  public async deleteRecipe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.headers['x-user-id'] as string) || 'default-local-user';
      const recipeId = req.params.id;
      await this.deleteRecipeService.execute(userId, recipeId);
      res.status(204).send();
    } catch (error: any) {
      if (error instanceof RecipeNotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error: ' + error?.message });
      }
    }
  }

  public async getRecipes(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.headers['x-user-id'] as string) || 'default-local-user';
      const recipes = await this.recipeRepository.findAll(userId);
      res.status(200).json(recipes);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to retrieve recipes: ' + error?.message });
    }
  }
}
