import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../infrastructure/http/server.ts';

describe('Express REST API HTTP Integration Tests', () => {
  const userId = 'e2e-test-user';
  const createdRecipeIds: string[] = [];

  // Teardown hook: Clean up all test-created recipes via DELETE API
  afterEach(async () => {
    while (createdRecipeIds.length > 0) {
      const id = createdRecipeIds.pop();
      if (id) {
        await request(app).delete(`/api/recipes/${id}`).set('x-user-id', userId);
      }
    }
  });

  it('GET /api/health returns 200 OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/recipes creates a new recipe via HTTP', async () => {
    const title = `HTTP Test Recipe ${Date.now()}`;
    const payload = {
      title,
      servings: 4,
      prep_time_minutes: 25,
      equipment: [{ name: 'Sarten grande' }],
      ingredients: [{ name: 'Olive oil', amount: 2, unit: 'tbsp' }],
      steps: [{ step_number: 1, instruction: 'Heat pan' }],
    };

    const res = await request(app)
      .post('/api/recipes')
      .set('x-user-id', userId)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.id).toBeDefined();
    createdRecipeIds.push(res.body.id);
  });

  it('PUT /api/recipes/:id updates existing recipe via HTTP', async () => {
    const originalTitle = `Original Recipe ${Date.now()}`;
    const updatedTitle = `Updated Original Recipe ${Date.now()}`;

    // 1. Create recipe
    const createRes = await request(app)
      .post('/api/recipes')
      .set('x-user-id', userId)
      .send({
        title: originalTitle,
        servings: 2,
        prep_time_minutes: 10,
        ingredients: [{ name: 'Water', amount: 1, unit: 'cup' }],
        steps: [{ step_number: 1, instruction: 'Boil water' }],
      });

    const recipeId = createRes.body.id;
    createdRecipeIds.push(recipeId);

    // 2. Update recipe
    const updateRes = await request(app)
      .put(`/api/recipes/${recipeId}`)
      .set('x-user-id', userId)
      .send({
        title: updatedTitle,
        servings: 4,
        prep_time_minutes: 15,
        equipment: [{ name: 'Cazuela' }],
        ingredients: [{ name: 'Water', amount: 2, unit: 'cup' }],
        steps: [{ step_number: 1, instruction: 'Boil water slowly' }],
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.id).toBe(recipeId);
    expect(updateRes.body.title).toBe(updatedTitle);
  });

  it('DELETE /api/recipes/:id deletes existing recipe via HTTP (204 No Content)', async () => {
    // 1. Create recipe
    const createRes = await request(app)
      .post('/api/recipes')
      .set('x-user-id', userId)
      .send({
        title: `Temp Recipe To Delete ${Date.now()}`,
        servings: 2,
        prep_time_minutes: 10,
        ingredients: [{ name: 'Milk', amount: 1, unit: 'cup' }],
        steps: [{ step_number: 1, instruction: 'Warm milk' }],
      });

    const recipeId = createRes.body.id;

    // 2. Delete recipe
    const deleteRes = await request(app)
      .delete(`/api/recipes/${recipeId}`)
      .set('x-user-id', userId);

    expect(deleteRes.status).toBe(204);

    // 3. Verify recipe is gone
    const fetchRes = await request(app)
      .put(`/api/recipes/${recipeId}`)
      .set('x-user-id', userId)
      .send({ title: 'X', servings: 1, prep_time_minutes: 1, ingredients: [{ name: 'X', amount: 1, unit: 'unit' }], steps: [{ step_number: 1, instruction: 'X' }] });

    expect(fetchRes.status).toBe(404);
  });

  it('DELETE /api/recipes/:id with non-existent ID returns JSON 404', async () => {
    const res = await request(app)
      .delete('/api/recipes/non-existent-id-9999')
      .set('x-user-id', userId);

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.error).toBeDefined();
  });
});
