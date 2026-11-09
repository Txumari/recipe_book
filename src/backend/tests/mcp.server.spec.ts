import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Client } from '@modelcontextprotocol/client';
import { createTempServices, connectClient } from './support/mcp-test-harness.ts';
import { makeRecipe } from './support/in-memory-repositories.ts';
import { nextWeekMonday } from '../infrastructure/mcp/recipes-mcp.server.ts';

const USER = 'ana';
const WEEK = '2026-11-09';
const EXPECTED_TOOLS = [
  'get_recipe',
  'get_weekly_menu',
  'list_recipes',
  'list_weekly_menus',
  'save_weekly_menu',
  'set_menu_slot',
];

type ToolResult = { isError?: boolean; content: { type: string; text?: string }[]; structuredContent?: any };

describe('Recipes MCP server (tools & prompt via MCP client)', () => {
  let env: ReturnType<typeof createTempServices>;
  let client: Client;
  let close: () => Promise<void>;
  let tortilla: { id: string };
  let lentejas: { id: string };
  let ensalada: { id: string };
  // Other suites write ./data in parallel, so check only that nothing from THIS suite lands there.
  const SUITE_USERS = [USER, 'bob'];
  const sharedDataOwners = (file: string): string[] => {
    const p = path.join('data', file);
    if (!fs.existsSync(p)) return [];
    try {
      return (JSON.parse(fs.readFileSync(p, 'utf-8')) as { userId: string }[]).map(r => r.userId);
    } catch {
      return [];
    }
  };

  const call = async (name: string, args: Record<string, unknown> = {}) =>
    (await client.callTool({ name, arguments: args })) as unknown as ToolResult;

  beforeEach(async () => {
    env = createTempServices();
    tortilla = await env.recipeRepository.save(
      makeRecipe(USER, 'Tortilla de patatas', { prep_time_minutes: 30, ingredients: ['Eggs', 'Potatoes'], description: 'Spanish omelette' })
    );
    lentejas = await env.recipeRepository.save(
      makeRecipe(USER, 'Lentejas', { prep_time_minutes: 60, ingredients: ['Lentils', 'Carrot'] })
    );
    ensalada = await env.recipeRepository.save(
      makeRecipe(USER, 'Ensalada rápida', { prep_time_minutes: 10, ingredients: ['Lettuce', 'Boiled egg'] })
    );
    await env.recipeRepository.save(makeRecipe('bob', 'Paella de Bob'));
    ({ client, close } = await connectClient(USER, env.services));
  });

  afterEach(async () => {
    await close();
    env.cleanup();
    // The suite must never write to the shared ./data directory.
    for (const file of ['recipes.json', 'menus.json']) {
      expect(sharedDataOwners(file).filter(u => SUITE_USERS.includes(u))).toEqual([]);
    }
    expect(env.dir.startsWith(os.tmpdir())).toBe(true);
  });

  describe('discovery', () => {
    it('identifies itself as mela-recipes with the package version', () => {
      const info = client.getServerVersion();
      expect(info?.name).toBe('mela-recipes');
      expect(info?.version).toBe(JSON.parse(fs.readFileSync('package.json', 'utf-8')).version);
    });

    it('lists exactly the six spec tools and no recipe-writing tool', async () => {
      const { tools } = await client.listTools();
      const names = tools.map(t => t.name).sort();
      expect(names).toEqual(EXPECTED_TOOLS);
      for (const t of tools) {
        expect(t.name).not.toMatch(/(create|update|delete|add|remove|edit)_recipe/);
        expect(t.inputSchema).toBeDefined();
      }
    });

    it('marks the read tools read-only and save_weekly_menu destructive', async () => {
      const { tools } = await client.listTools();
      const byName = Object.fromEntries(tools.map(t => [t.name, t]));
      for (const name of ['list_recipes', 'get_recipe', 'list_weekly_menus', 'get_weekly_menu']) {
        expect(byName[name].annotations?.readOnlyHint).toBe(true);
      }
      expect(byName.save_weekly_menu.annotations?.destructiveHint).toBe(true);
      expect(byName.save_weekly_menu.annotations?.readOnlyHint).toBe(false);
      expect(byName.set_menu_slot.annotations?.readOnlyHint).toBe(false);
    });

    it('lists the plan_weekly_menu prompt', async () => {
      const { prompts } = await client.listPrompts();
      expect(prompts.map(p => p.name)).toEqual(['plan_weekly_menu']);
    });
  });

  describe('list_recipes', () => {
    it('returns summaries of all of the user\'s recipes (structured + JSON text)', async () => {
      const res = await call('list_recipes');
      expect(res.isError).toBeFalsy();
      const titles = res.structuredContent.recipes.map((r: { title: string }) => r.title).sort();
      expect(titles).toEqual(['Ensalada rápida', 'Lentejas', 'Tortilla de patatas']);
      expect(res.structuredContent.recipes.find((r: any) => r.id === tortilla.id)).toEqual({
        id: tortilla.id,
        title: 'Tortilla de patatas',
        description: 'Spanish omelette',
        servings: 2,
        prep_time_minutes: 30,
        ingredient_names: ['Eggs', 'Potatoes'],
      });
      const text = res.content.find(c => c.type === 'text')?.text ?? '';
      expect(JSON.parse(text)).toEqual(res.structuredContent);
    });

    it('combines prep-time and ingredient filters with AND', async () => {
      const res = await call('list_recipes', { max_prep_time_minutes: 30, ingredient: 'egg' });
      const ids = res.structuredContent.recipes.map((r: { id: string }) => r.id).sort();
      expect(ids).toEqual([tortilla.id, ensalada.id].sort());
    });

    it('matches query on title or description and applies limit', async () => {
      const byDescription = await call('list_recipes', { query: 'OMELETTE' });
      expect(byDescription.structuredContent.recipes.map((r: any) => r.id)).toEqual([tortilla.id]);
      const limited = await call('list_recipes', { limit: 1 });
      expect(limited.structuredContent.recipes).toHaveLength(1);
    });

    it('returns an empty list with a message when nothing matches', async () => {
      const res = await call('list_recipes', { query: 'sushi' });
      expect(res.isError).toBeFalsy();
      expect(res.structuredContent).toEqual({ recipes: [], message: 'No recipes matched the given filters.' });
    });
  });

  describe('get_recipe', () => {
    it('returns the full recipe', async () => {
      const res = await call('get_recipe', { recipe_id: lentejas.id });
      expect(res.structuredContent.recipe).toMatchObject({
        id: lentejas.id,
        title: 'Lentejas',
        ingredients: [
          { name: 'Lentils', amount: 1, unit: 'unit' },
          { name: 'Carrot', amount: 1, unit: 'unit' },
        ],
        steps: [{ step_number: 1, instruction: 'Cook it' }],
        equipment: [],
      });
    });

    it("returns a tool error for an unknown or another user's recipe", async () => {
      const res = await call('get_recipe', { recipe_id: 'recipe-nope' });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toMatch(/not found/);
    });
  });

  describe('weekly menu tools', () => {
    it('save_weekly_menu stores a full week and get_weekly_menu reads it back', async () => {
      const saved = await call('save_weekly_menu', {
        week_start: WEEK,
        meals: [
          { day: 'monday', slot: 'lunch', recipe_id: tortilla.id },
          { day: 'monday', slot: 'dinner', recipe_id: ensalada.id, note: 'light' },
          { day: 'wednesday', slot: 'lunch', recipe_id: lentejas.id },
        ],
      });
      expect(saved.isError).toBeFalsy();
      expect(saved.structuredContent.created).toBe(true);
      expect(saved.structuredContent.menu.meals[0].recipe_title).toBe('Tortilla de patatas');

      const read = await call('get_weekly_menu', { week_start: WEEK });
      expect(read.structuredContent.menu.meals).toEqual([
        { day: 'monday', slot: 'lunch', recipe_id: tortilla.id, recipe_title: 'Tortilla de patatas', recipe_available: true },
        { day: 'monday', slot: 'dinner', recipe_id: ensalada.id, recipe_title: 'Ensalada rápida', recipe_available: true, note: 'light' },
        { day: 'wednesday', slot: 'lunch', recipe_id: lentejas.id, recipe_title: 'Lentejas', recipe_available: true },
      ]);
    });

    it('get_weekly_menu explicitly says when no menu exists (not an error)', async () => {
      const res = await call('get_weekly_menu', { week_start: WEEK });
      expect(res.isError).toBeFalsy();
      expect(res.structuredContent.menu).toBeNull();
      expect(res.structuredContent.message).toMatch(/No weekly menu exists/);
    });

    it('rejects a non-Monday week_start with a readable error, then keeps working', async () => {
      for (const name of ['get_weekly_menu', 'save_weekly_menu']) {
        const res = await call(name, { week_start: '2026-11-11', meals: [] });
        expect(res.isError).toBe(true);
        expect(res.content[0].text).toMatch(/Monday in YYYY-MM-DD/);
      }
      const ok = await call('list_weekly_menus');
      expect(ok.isError).toBeFalsy();
    });

    it('rejects an invented recipe_id and leaves the stored menu unchanged', async () => {
      await call('save_weekly_menu', { week_start: WEEK, meals: [{ day: 'monday', slot: 'lunch', recipe_id: tortilla.id }] });
      const res = await call('save_weekly_menu', {
        week_start: WEEK,
        meals: [{ day: 'tuesday', slot: 'lunch', recipe_id: 'recipe-invented-by-llm' }],
      });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('recipe-invented-by-llm');
      const read = await call('get_weekly_menu', { week_start: WEEK });
      expect(read.structuredContent.menu.meals.map((m: any) => m.recipe_id)).toEqual([tortilla.id]);
    });

    it('rejects schema-invalid input (unknown slot) as a tool error', async () => {
      const res = await call('save_weekly_menu', {
        week_start: WEEK,
        meals: [{ day: 'monday', slot: 'brunch', recipe_id: tortilla.id }],
      });
      expect(res.isError).toBe(true);
    });

    it("cannot use another user's recipe", async () => {
      const bobsRecipes = await env.recipeRepository.findAll('bob');
      const res = await call('set_menu_slot', { week_start: WEEK, day: 'monday', slot: 'lunch', recipe_id: bobsRecipes[0].id });
      expect(res.isError).toBe(true);
    });

    it('set_menu_slot swaps one meal and keeps the others', async () => {
      await call('save_weekly_menu', {
        week_start: WEEK,
        meals: [
          { day: 'monday', slot: 'lunch', recipe_id: tortilla.id },
          { day: 'friday', slot: 'dinner', recipe_id: tortilla.id },
        ],
      });
      const res = await call('set_menu_slot', { week_start: WEEK, day: 'friday', slot: 'dinner', recipe_id: lentejas.id });
      expect(res.isError).toBeFalsy();
      expect(res.structuredContent.menu.meals.map((m: any) => `${m.day}:${m.slot}:${m.recipe_id}`)).toEqual([
        `monday:lunch:${tortilla.id}`,
        `friday:dinner:${lentejas.id}`,
      ]);
    });

    it('set_menu_slot with recipe_id null clears the slot, creating the menu if needed', async () => {
      const created = await call('set_menu_slot', { week_start: WEEK, day: 'monday', slot: 'lunch', recipe_id: tortilla.id });
      expect(created.structuredContent.created).toBe(true);
      const cleared = await call('set_menu_slot', { week_start: WEEK, day: 'monday', slot: 'lunch', recipe_id: null });
      expect(cleared.structuredContent.menu.meals).toEqual([]);
    });

    it('list_weekly_menus returns menus most recent first', async () => {
      await call('save_weekly_menu', { week_start: '2026-11-02', meals: [] });
      await call('save_weekly_menu', { week_start: '2026-11-16', meals: [] });
      const res = await call('list_weekly_menus');
      expect(res.structuredContent.menus.map((m: any) => m.week_start)).toEqual(['2026-11-16', '2026-11-02']);
    });
  });

  describe('plan_weekly_menu prompt', () => {
    it('includes preferences, target week and confirm-before-save guidance', async () => {
      const res = await client.getPrompt({
        name: 'plan_weekly_menu',
        arguments: { week_start: WEEK, preferences: 'quick dinners, lunch and dinner only' },
      });
      const text = (res.messages[0].content as { text: string }).text;
      expect(text).toContain('quick dinners, lunch and dinner only');
      expect(text).toContain(WEEK);
      expect(text).toContain('list_recipes');
      expect(text).toMatch(/Only after the user agrees, call save_weekly_menu/);
    });

    it('defaults to next week\'s Monday', async () => {
      const res = await client.getPrompt({ name: 'plan_weekly_menu', arguments: {} });
      expect((res.messages[0].content as { text: string }).text).toContain(nextWeekMonday());
    });

    it('computes next week\'s Monday from any day', () => {
      expect(nextWeekMonday(new Date(2026, 10, 9))).toBe('2026-11-16'); // Monday -> following Monday
      expect(nextWeekMonday(new Date(2026, 10, 11))).toBe('2026-11-16'); // Wednesday
      expect(nextWeekMonday(new Date(2026, 10, 15))).toBe('2026-11-16'); // Sunday -> tomorrow
      expect(nextWeekMonday(new Date(2026, 11, 30))).toBe('2027-01-04'); // year boundary
    });
  });
});
