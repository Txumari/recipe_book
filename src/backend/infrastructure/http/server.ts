import express from 'express';
import cors from 'cors';
import { JsonFileRecipeRepository } from '../repositories/json-file-recipe.repository.ts';
import { CreateRecipeService } from '../../application/use-cases/create-recipe.service.ts';
import { UpdateRecipeService } from '../../application/use-cases/update-recipe.service.ts';
import { RecipeController } from './recipe.controller.ts';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Wire up Dependency Injection
const recipeRepository = new JsonFileRecipeRepository();
const createRecipeService = new CreateRecipeService(recipeRepository);
const updateRecipeService = new UpdateRecipeService(recipeRepository);
const recipeController = new RecipeController(createRecipeService, updateRecipeService, recipeRepository);

// Routes
app.post('/api/recipes', (req, res) => recipeController.createRecipe(req, res));
app.put('/api/recipes/:id', (req, res) => recipeController.updateRecipe(req, res));
app.get('/api/recipes', (req, res) => recipeController.getRecipes(req, res));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', server: 'Express Recipe API', port: PORT });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🍳 Express Recipe REST API listening on http://localhost:${PORT}`);
  });
}

export { app, recipeRepository, createRecipeService, updateRecipeService };
