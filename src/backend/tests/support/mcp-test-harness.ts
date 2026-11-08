import fs from 'fs';
import os from 'os';
import path from 'path';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { JsonFileRecipeRepository } from '../../infrastructure/repositories/json-file-recipe.repository.ts';
import { JsonFileMenuRepository } from '../../infrastructure/repositories/json-file-menu.repository.ts';
import { SaveWeeklyMenuService } from '../../application/use-cases/save-weekly-menu.service.ts';
import { SetMenuSlotService } from '../../application/use-cases/set-menu-slot.service.ts';
import { GetWeeklyMenuService } from '../../application/use-cases/get-weekly-menu.service.ts';
import { ListWeeklyMenusService } from '../../application/use-cases/list-weekly-menus.service.ts';
import { createRecipesMcpServer, RecipesMcpServices } from '../../infrastructure/mcp/recipes-mcp.server.ts';

/** Services backed by JSON files in a throw-away temp directory (never touches ./data). */
export function createTempServices() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-tools-'));
  const recipeRepository = new JsonFileRecipeRepository(path.join(dir, 'recipes.json'));
  const menuRepository = new JsonFileMenuRepository(path.join(dir, 'menus.json'));
  const saveWeeklyMenuService = new SaveWeeklyMenuService(menuRepository, recipeRepository);
  const services: RecipesMcpServices = {
    recipeRepository,
    saveWeeklyMenuService,
    setMenuSlotService: new SetMenuSlotService(menuRepository, saveWeeklyMenuService),
    getWeeklyMenuService: new GetWeeklyMenuService(menuRepository, recipeRepository),
    listWeeklyMenusService: new ListWeeklyMenusService(menuRepository, recipeRepository),
  };
  return {
    dir,
    services,
    recipeRepository,
    menuRepository,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

export async function connectClient(userId: string, services: RecipesMcpServices) {
  const server = createRecipesMcpServer({ userId, services });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'mela-test-client', version: '1.0.0' });
  await client.connect(clientTransport);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}
