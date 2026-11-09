import express from 'express';
import cors from 'cors';
import { JsonFileRecipeRepository } from '../repositories/json-file-recipe.repository.ts';
import { CreateRecipeService } from '../../application/use-cases/create-recipe.service.ts';
import { UpdateRecipeService } from '../../application/use-cases/update-recipe.service.ts';
import { DeleteRecipeService } from '../../application/use-cases/delete-recipe.service.ts';
import { RecipeController } from './recipe.controller.ts';
import { JsonFileMenuRepository } from '../repositories/json-file-menu.repository.ts';
import { SaveWeeklyMenuService } from '../../application/use-cases/save-weekly-menu.service.ts';
import { SetMenuSlotService } from '../../application/use-cases/set-menu-slot.service.ts';
import { GetWeeklyMenuService } from '../../application/use-cases/get-weekly-menu.service.ts';
import { ListWeeklyMenusService } from '../../application/use-cases/list-weekly-menus.service.ts';
import { DeleteWeeklyMenuService } from '../../application/use-cases/delete-weekly-menu.service.ts';
import { MenuController } from './menu.controller.ts';
import { createMcpRouter } from '../mcp/mcp-http.ts';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Wire up Dependency Injection
const recipeRepository = new JsonFileRecipeRepository();
const createRecipeService = new CreateRecipeService(recipeRepository);
const updateRecipeService = new UpdateRecipeService(recipeRepository);
const deleteRecipeService = new DeleteRecipeService(recipeRepository);
const recipeController = new RecipeController(
  createRecipeService,
  updateRecipeService,
  deleteRecipeService,
  recipeRepository
);

const menuRepository = new JsonFileMenuRepository();
const saveWeeklyMenuService = new SaveWeeklyMenuService(menuRepository, recipeRepository);
const setMenuSlotService = new SetMenuSlotService(menuRepository, saveWeeklyMenuService);
const getWeeklyMenuService = new GetWeeklyMenuService(menuRepository, recipeRepository);
const listWeeklyMenusService = new ListWeeklyMenusService(menuRepository, recipeRepository);
const deleteWeeklyMenuService = new DeleteWeeklyMenuService(menuRepository);
const menuController = new MenuController(
  saveWeeklyMenuService,
  getWeeklyMenuService,
  listWeeklyMenusService,
  deleteWeeklyMenuService
);

// Routes
app.post('/api/recipes', (req, res) => recipeController.createRecipe(req, res));
app.put('/api/recipes/:id', (req, res) => recipeController.updateRecipe(req, res));
app.delete('/api/recipes/:id', (req, res) => recipeController.deleteRecipe(req, res));
app.get('/api/recipes', (req, res) => recipeController.getRecipes(req, res));

app.get('/api/menus', (req, res) => menuController.listMenus(req, res));
app.get('/api/menus/:weekStart', (req, res) => menuController.getMenu(req, res));
app.put('/api/menus/:weekStart', (req, res) => menuController.putMenu(req, res));
app.delete('/api/menus/:weekStart', (req, res) => menuController.deleteMenu(req, res));

// MCP endpoint for AI agents (stateless Streamable HTTP, development only until auth exists)
app.use(
  '/mcp',
  createMcpRouter({
    recipeRepository,
    saveWeeklyMenuService,
    setMenuSlotService,
    getWeeklyMenuService,
    listWeeklyMenusService,
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', server: 'Express Recipe API', port: PORT });
});

// JSON fallback for unmatched API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🍳 Express Recipe REST API listening on http://localhost:${PORT}`);
  });
}

export {
  app,
  recipeRepository,
  createRecipeService,
  updateRecipeService,
  deleteRecipeService,
  menuRepository,
  saveWeeklyMenuService,
  setMenuSlotService,
  getWeeklyMenuService,
  listWeeklyMenusService,
  deleteWeeklyMenuService,
};
