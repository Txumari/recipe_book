import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../infrastructure/http/server.ts';

const USER = 'menu-http-test-user';
const OTHER_USER = 'menu-http-other-user';
const WEEK = '2030-01-07';
const NEXT_WEEK = '2030-01-14';

describe('Weekly Menu REST API (/api/menus)', () => {
  const createdRecipes: { userId: string; id: string }[] = [];
  const createdMenus: { userId: string; week: string }[] = [];
  let recipeId: string;
  let otherRecipeId: string;

  const createRecipe = async (userId: string, title: string) => {
    const res = await request(app)
      .post('/api/recipes')
      .set('x-user-id', userId)
      .send({
        title: `${title} ${Date.now()}-${Math.random()}`,
        servings: 2,
        prep_time_minutes: 15,
        ingredients: [{ name: 'Egg', amount: 2, unit: 'unit' }],
        steps: [{ step_number: 1, instruction: 'Cook' }],
      });
    expect(res.status).toBe(201);
    createdRecipes.push({ userId, id: res.body.id });
    return res.body;
  };

  const putMenu = (userId: string, week: string, meals: unknown) => {
    createdMenus.push({ userId, week });
    return request(app).put(`/api/menus/${week}`).set('x-user-id', userId).send({ meals });
  };

  beforeEach(async () => {
    recipeId = (await createRecipe(USER, 'Menu HTTP Tortilla')).id;
    otherRecipeId = (await createRecipe(USER, 'Menu HTTP Lentejas')).id;
  });

  // Teardown: remove every menu and recipe created by these tests.
  afterEach(async () => {
    while (createdMenus.length > 0) {
      const m = createdMenus.pop()!;
      await request(app).delete(`/api/menus/${m.week}`).set('x-user-id', m.userId);
    }
    while (createdRecipes.length > 0) {
      const r = createdRecipes.pop()!;
      await request(app).delete(`/api/recipes/${r.id}`).set('x-user-id', r.userId);
    }
  });

  it('PUT creates a new week (201) and replaces it on the next call (200)', async () => {
    const created = await putMenu(USER, WEEK, [{ day: 'monday', slot: 'lunch', recipe_id: recipeId }]);
    expect(created.status).toBe(201);
    expect(created.body.week_start).toBe(WEEK);
    expect(created.body.meals[0]).toMatchObject({ recipe_id: recipeId, recipe_available: true });

    const replaced = await putMenu(USER, WEEK, [{ day: 'friday', slot: 'dinner', recipe_id: otherRecipeId }]);
    expect(replaced.status).toBe(200);
    expect(replaced.body.id).toBe(created.body.id);
    expect(replaced.body.createdAt).toBe(created.body.createdAt);
    expect(replaced.body.meals).toHaveLength(1);
  });

  it('GET one week returns the menu with titles and availability', async () => {
    await putMenu(USER, WEEK, [{ day: 'monday', slot: 'lunch', recipe_id: recipeId, note: 'leftovers' }]);
    const res = await request(app).get(`/api/menus/${WEEK}`).set('x-user-id', USER);
    expect(res.status).toBe(200);
    expect(res.body.meals[0]).toMatchObject({
      day: 'monday',
      slot: 'lunch',
      recipe_id: recipeId,
      recipe_available: true,
      note: 'leftovers',
    });
    expect(res.body.meals[0].recipe_title).toMatch(/^Menu HTTP Tortilla/);
  });

  it('GET a week without a menu returns 404 JSON', async () => {
    const res = await request(app).get(`/api/menus/${NEXT_WEEK}`).set('x-user-id', USER);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('GET /api/menus lists menus most recent first', async () => {
    await putMenu(USER, WEEK, []);
    await putMenu(USER, NEXT_WEEK, []);
    const res = await request(app).get('/api/menus').set('x-user-id', USER);
    expect(res.status).toBe(200);
    expect(res.body.map((m: { week_start: string }) => m.week_start)).toEqual([NEXT_WEEK, WEEK]);
  });

  it.each([
    ['a non-Monday week start', '2030-01-09', []],
    ['a duplicate slot', WEEK, 'DUPLICATE'],
    ['an unknown recipe', WEEK, [{ day: 'monday', slot: 'lunch', recipe_id: 'recipe-does-not-exist' }]],
    ['an over-long note', WEEK, 'LONG_NOTE'],
    ['a missing meals array', WEEK, undefined],
  ])('PUT rejects %s with 400 JSON', async (_label, week, mealsSpec) => {
    let meals: unknown = mealsSpec;
    if (mealsSpec === 'DUPLICATE') {
      meals = [
        { day: 'tuesday', slot: 'dinner', recipe_id: recipeId },
        { day: 'tuesday', slot: 'dinner', recipe_id: otherRecipeId },
      ];
    } else if (mealsSpec === 'LONG_NOTE') {
      meals = [{ day: 'monday', slot: 'lunch', recipe_id: recipeId, note: 'x'.repeat(201) }];
    }
    const res = await putMenu(USER, week as string, meals);
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('DELETE returns 204 when a menu existed and 404 otherwise', async () => {
    await putMenu(USER, WEEK, []);
    const first = await request(app).delete(`/api/menus/${WEEK}`).set('x-user-id', USER);
    expect(first.status).toBe(204);
    const second = await request(app).delete(`/api/menus/${WEEK}`).set('x-user-id', USER);
    expect(second.status).toBe(404);
    expect(second.body.error).toBeDefined();
  });

  it("isolates menus per user: another user's menu is invisible", async () => {
    await putMenu(USER, WEEK, [{ day: 'monday', slot: 'lunch', recipe_id: recipeId }]);
    const other = await request(app).get(`/api/menus/${WEEK}`).set('x-user-id', OTHER_USER);
    expect(other.status).toBe(404);
    const otherList = await request(app).get('/api/menus').set('x-user-id', OTHER_USER);
    expect(otherList.body).toEqual([]);
    // ...and cannot reference USER's recipes.
    const res = await putMenu(OTHER_USER, WEEK, [{ day: 'monday', slot: 'lunch', recipe_id: recipeId }]);
    expect(res.status).toBe(400);
  });

  it('marks an entry unavailable after its recipe is deleted', async () => {
    await putMenu(USER, WEEK, [{ day: 'monday', slot: 'lunch', recipe_id: recipeId }]);
    await request(app).delete(`/api/recipes/${recipeId}`).set('x-user-id', USER);
    const res = await request(app).get(`/api/menus/${WEEK}`).set('x-user-id', USER);
    expect(res.body.meals[0]).toMatchObject({ recipe_id: recipeId, recipe_available: false });
  });
});
