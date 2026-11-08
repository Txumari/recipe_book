import { createRequire } from 'module';
import * as z from 'zod';
import { McpServer } from '@modelcontextprotocol/server';
import type { CallToolResult } from '@modelcontextprotocol/server';
import { RecipeRepositoryPort } from '../../application/ports/recipe-repository.port.ts';
import { SaveWeeklyMenuUseCase } from '../../application/ports/save-weekly-menu.use-case.ts';
import { SetMenuSlotUseCase } from '../../application/ports/set-menu-slot.use-case.ts';
import { GetWeeklyMenuUseCase } from '../../application/ports/get-weekly-menu.use-case.ts';
import { ListWeeklyMenusUseCase } from '../../application/ports/list-weekly-menus.use-case.ts';
import { Recipe } from '../../domain/entities/recipe.entity.ts';
import { RecipeDomainError, RecipeNotFoundError } from '../../domain/errors/recipe-domain.error.ts';
import { MEAL_DAYS, MEAL_SLOTS, MAX_MEAL_NOTE_LENGTH } from '../../domain/value-objects/meal-entry.vo.ts';

const require = createRequire(import.meta.url);
const { version: APP_VERSION } = require('../../../../package.json') as { version: string };

export const MCP_SERVER_NAME = 'mela-recipes';

export interface RecipesMcpServices {
  recipeRepository: RecipeRepositoryPort;
  saveWeeklyMenuService: SaveWeeklyMenuUseCase;
  setMenuSlotService: SetMenuSlotUseCase;
  getWeeklyMenuService: GetWeeklyMenuUseCase;
  listWeeklyMenusService: ListWeeklyMenusUseCase;
}

export interface CreateRecipesMcpServerOptions {
  /** Acting user, resolved by the caller (never taken from tool arguments). */
  userId: string;
  services: RecipesMcpServices;
}

// ---------- Result helpers ----------

export function jsonResult(data: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

export function errorResult(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

async function run(fn: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof RecipeDomainError) {
      return errorResult(error.message);
    }
    console.error('[mcp] Unexpected tool error:', error);
    return errorResult('Unexpected server error while running the tool. Please try again.');
  }
}

// ---------- Schemas ----------

const WEEK_START_DESCRIPTION =
  'Monday that starts the week, as YYYY-MM-DD (for example 2026-11-09). Must be a Monday.';

const weekStartInput = z.string().describe(WEEK_START_DESCRIPTION);
const dayInput = z.enum(MEAL_DAYS).describe(`Day of the week: ${MEAL_DAYS.join(', ')}.`);
const slotInput = z.enum(MEAL_SLOTS).describe(`Meal slot: ${MEAL_SLOTS.join(', ')}.`);
const noteInput = z
  .string()
  .max(MAX_MEAL_NOTE_LENGTH)
  .optional()
  .describe(`Optional short note (max ${MAX_MEAL_NOTE_LENGTH} characters), e.g. "double portion for leftovers".`);

const recipeSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  servings: z.number(),
  prep_time_minutes: z.number(),
  ingredient_names: z.array(z.string()),
});

const recipeDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  servings: z.number(),
  prep_time_minutes: z.number(),
  equipment: z.array(
    z.object({ name: z.string(), specification: z.string().optional(), is_optional: z.boolean().optional() })
  ),
  ingredients: z.array(z.object({ name: z.string(), amount: z.number(), unit: z.string() })),
  steps: z.array(z.object({ step_number: z.number(), instruction: z.string() })),
});

const mealEntryViewSchema = z.object({
  day: z.string(),
  slot: z.string(),
  recipe_id: z.string(),
  recipe_title: z.string(),
  recipe_available: z.boolean(),
  note: z.string().optional(),
});

const menuViewSchema = z.object({
  id: z.string(),
  week_start: z.string(),
  meals: z.array(mealEntryViewSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const savedMenuSchema = z.object({ menu: menuViewSchema, created: z.boolean() });

// ---------- Mappers ----------

function toSummary(r: Recipe): z.infer<typeof recipeSummarySchema> {
  return {
    id: r.id,
    title: r.title,
    ...(r.description ? { description: r.description } : {}),
    servings: r.servings,
    prep_time_minutes: r.prep_time_minutes,
    ingredient_names: r.ingredients.map(i => i.name),
  };
}

function toDetail(r: Recipe): z.infer<typeof recipeDetailSchema> {
  return {
    id: r.id,
    title: r.title,
    ...(r.description ? { description: r.description } : {}),
    servings: r.servings,
    prep_time_minutes: r.prep_time_minutes,
    equipment: r.equipment.map(e => ({
      name: e.name,
      ...(e.specification ? { specification: e.specification } : {}),
      ...(e.is_optional !== undefined ? { is_optional: e.is_optional } : {}),
    })),
    ingredients: r.ingredients.map(i => ({ name: i.name, amount: i.amount, unit: i.unit })),
    steps: r.steps.map(s => ({ step_number: s.step_number, instruction: s.instruction })),
  };
}

function toIsoLocalDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday of next week in local time (on a Monday this is 7 days ahead; on a Sunday, tomorrow). */
export function nextWeekMonday(today: Date = new Date()): string {
  const daysUntil = (8 - today.getDay()) % 7 || 7;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntil);
  return toIsoLocalDate(d);
}

// ---------- Server factory ----------

/**
 * Builds a fresh MCP server bound to one user. Stateless HTTP creates one per request;
 * tests connect one directly through an in-memory transport.
 */
export function createRecipesMcpServer({ userId, services }: CreateRecipesMcpServerOptions): McpServer {
  const server = new McpServer({ name: MCP_SERVER_NAME, version: APP_VERSION });

  server.registerTool(
    'list_recipes',
    {
      title: 'Search recipes',
      description:
        "Search the user's own recipes and return short summaries (id, title, description, servings, prep time, ingredient names). " +
        'All filters are optional and combined with AND. Use the returned `id` values as `recipe_id` in menu tools; never invent IDs.',
      inputSchema: z.object({
        query: z.string().optional().describe('Case-insensitive text matched against the title or description.'),
        ingredient: z.string().optional().describe('Case-insensitive text matched against ingredient names, e.g. "egg".'),
        max_prep_time_minutes: z.number().int().positive().optional().describe('Only recipes that take at most this many minutes.'),
        limit: z.number().int().positive().max(200).optional().describe('Maximum number of recipes to return.'),
      }),
      outputSchema: z.object({ recipes: z.array(recipeSummarySchema), message: z.string().optional() }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ query, ingredient, max_prep_time_minutes, limit }) =>
      run(async () => {
        const q = query?.trim().toLowerCase();
        const ing = ingredient?.trim().toLowerCase();
        let recipes = (await services.recipeRepository.findAll(userId)).filter(r => {
          if (q && !r.title.toLowerCase().includes(q) && !(r.description ?? '').toLowerCase().includes(q)) return false;
          if (ing && !r.ingredients.some(i => i.name.toLowerCase().includes(ing))) return false;
          if (max_prep_time_minutes !== undefined && r.prep_time_minutes > max_prep_time_minutes) return false;
          return true;
        });
        if (limit !== undefined) recipes = recipes.slice(0, limit);
        const summaries = recipes.map(toSummary);
        return jsonResult(
          summaries.length === 0
            ? { recipes: [], message: 'No recipes matched the given filters.' }
            : { recipes: summaries }
        );
      })
  );

  server.registerTool(
    'get_recipe',
    {
      title: 'Get recipe details',
      description:
        'Return one of the user\'s recipes in full: ingredients with amounts and units, equipment and ordered steps. `recipe_id` must come from list_recipes.',
      inputSchema: z.object({ recipe_id: z.string().min(1).describe('Recipe ID returned by list_recipes.') }),
      outputSchema: z.object({ recipe: recipeDetailSchema }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ recipe_id }) =>
      run(async () => {
        const recipe = await services.recipeRepository.findById(userId, recipe_id);
        if (!recipe) throw new RecipeNotFoundError(recipe_id);
        return jsonResult({ recipe: toDetail(recipe) });
      })
  );

  server.registerTool(
    'list_weekly_menus',
    {
      title: 'List weekly menus',
      description: "List the user's saved weekly menus, most recent week first.",
      inputSchema: z.object({}),
      outputSchema: z.object({ menus: z.array(menuViewSchema) }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => run(async () => jsonResult({ menus: await services.listWeeklyMenusService.execute(userId) }))
  );

  server.registerTool(
    'get_weekly_menu',
    {
      title: 'Get weekly menu',
      description:
        'Return the saved menu of one week, with each meal\'s day, slot, recipe_id, recipe_title, recipe_available (false if the recipe was deleted) and note. ' +
        'If the week has no menu, returns `menu: null` with a message (not an error).',
      inputSchema: z.object({ week_start: weekStartInput }),
      outputSchema: z.object({ menu: menuViewSchema.nullable(), message: z.string().optional() }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ week_start }) =>
      run(async () => {
        const menu = await services.getWeeklyMenuService.execute(userId, week_start);
        return jsonResult(
          menu ? { menu } : { menu: null, message: `No weekly menu exists yet for the week starting ${week_start}.` }
        );
      })
  );

  server.registerTool(
    'save_weekly_menu',
    {
      title: 'Save weekly menu',
      description:
        'Create or REPLACE the whole menu of one week with the given meals (any previous meals of that week are removed). ' +
        `Each meal needs day (${MEAL_DAYS.join(', ')}), slot (${MEAL_SLOTS.join(', ')}) and a recipe_id from list_recipes. ` +
        'Each day+slot may appear at most once; empty slots are fine. Show the proposed menu to the user and get their approval before calling this.',
      inputSchema: z.object({
        week_start: weekStartInput,
        meals: z
          .array(z.object({ day: dayInput, slot: slotInput, recipe_id: z.string().min(1), note: noteInput }))
          .describe('Full list of meals for the week.'),
      }),
      outputSchema: savedMenuSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ week_start, meals }) =>
      run(async () => {
        const result = await services.saveWeeklyMenuService.execute(userId, week_start, meals);
        return jsonResult({ ...result });
      })
  );

  server.registerTool(
    'set_menu_slot',
    {
      title: 'Set one menu slot',
      description:
        'Assign one recipe to a single day+slot of a week, or clear it with `recipe_id: null`. Other meals of the week are kept. ' +
        'Creates the week\'s menu if it does not exist yet. `recipe_id` must come from list_recipes.',
      inputSchema: z.object({
        week_start: weekStartInput,
        day: dayInput,
        slot: slotInput,
        recipe_id: z.string().min(1).nullable().describe('Recipe ID from list_recipes, or null to clear the slot.'),
        note: noteInput,
      }),
      outputSchema: savedMenuSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ week_start, day, slot, recipe_id, note }) =>
      run(async () => {
        const result = await services.setMenuSlotService.execute(userId, week_start, { day, slot, recipe_id, note });
        return jsonResult({ ...result });
      })
  );

  server.registerPrompt(
    'plan_weekly_menu',
    {
      title: 'Plan a weekly menu',
      description: "Guide the assistant to plan a week of meals from the user's own recipes and save it after approval.",
      argsSchema: z.object({
        week_start: z.string().optional().describe('Monday of the week to plan (YYYY-MM-DD). Defaults to next week.'),
        preferences: z.string().optional().describe('Free-text preferences, e.g. "quick dinners, lunch and dinner only".'),
      }),
    },
    ({ week_start, preferences }) => {
      const week = week_start?.trim() || nextWeekMonday();
      const prefs = preferences?.trim() || 'No specific preferences given; ask the user if anything matters to them.';
      const text = [
        `Plan a weekly menu for the week starting Monday ${week}.`,
        '',
        `User preferences: ${prefs}`,
        '',
        'How to do it:',
        '1. Call list_recipes (with filters if useful) and only use recipes it returns. Never invent recipes or IDs. Use get_recipe if you need details.',
        `2. Choose which slots to fill (${MEAL_SLOTS.join(', ')}) for each day (${MEAL_DAYS.join(', ')}). Empty slots are allowed.`,
        '3. Respect the preferences above and avoid repeating the same recipe where possible.',
        '4. Show the proposed menu to the user as a readable table and ask for approval or changes.',
        `5. Only after the user agrees, call save_weekly_menu with week_start "${week}". For later single changes use set_menu_slot.`,
      ].join('\n');
      return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }] };
    }
  );

  return server;
}
