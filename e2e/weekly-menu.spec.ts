import { test, expect } from '@playwright/test';

const USER_HEADERS = { 'x-user-id': 'default-local-user' };

/** Monday of the current local week as YYYY-MM-DD (same rule as the Weekly Menu view). */
function currentWeekStart(): string {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
}

test.describe('E2E Weekly Menu', () => {
  let recipeId: string | undefined;
  const weekStart = currentWeekStart();

  // Teardown: remove the menu and recipe created by this test.
  test.afterEach(async ({ request }) => {
    await request.delete(`/api/menus/${weekStart}`, { headers: USER_HEADERS });
    if (recipeId) {
      await request.delete(`/api/recipes/${recipeId}`, { headers: USER_HEADERS });
      recipeId = undefined;
    }
  });

  test('User can assign, persist, clear a slot and delete the weekly menu', async ({ page, request }) => {
    // Start from a clean week so the test does not depend on existing data.
    await request.delete(`/api/menus/${weekStart}`, { headers: USER_HEADERS });

    // 1. Create a recipe through the API.
    const title = `E2E Menu Recipe ${Date.now()}`;
    const created = await request.post('/api/recipes', {
      headers: USER_HEADERS,
      data: {
        title,
        servings: 2,
        prep_time_minutes: 15,
        ingredients: [{ name: 'Huevo', amount: 2, unit: 'unit' }],
        steps: [{ step_number: 1, instruction: 'Batir y cuajar' }],
      },
    });
    expect(created.status()).toBe(201);
    recipeId = (await created.json()).id;

    // 2. Open the Weekly Menu view: empty state for this week.
    await page.goto('/');
    await page.click('button:has-text("Weekly Menu")');
    await expect(page.locator('h1')).toHaveText('Weekly Menu');
    await expect(page.getByTestId('menu-empty-state')).toBeVisible();

    // 3. Assign the recipe to Thursday dinner; it is saved immediately.
    const thursdayDinner = page.getByTestId('menu-cell-thursday-dinner');
    await page.selectOption('select[aria-label="Thursday dinner"]', { label: title });
    await expect(thursdayDinner.locator('.weekly-menu-recipe-link')).toHaveText(title);
    await expect(page.getByTestId('menu-empty-state')).toBeHidden();

    // 4. Reload: the assignment persisted on the backend.
    await page.reload();
    await page.click('button:has-text("Weekly Menu")');
    await expect(thursdayDinner.locator('.weekly-menu-recipe-link')).toHaveText(title);

    // 5. Clicking the recipe opens its detail view; come back to the menu.
    await thursdayDinner.locator('.weekly-menu-recipe-link').click();
    await expect(page.locator('.detail-header h1')).toHaveText(title);
    await page.click('button:has-text("Weekly Menu")');

    // 6. Clear the slot.
    await page.selectOption('select[aria-label="Thursday dinner"]', { value: '' });
    await expect(thursdayDinner.locator('.weekly-menu-recipe-link')).toHaveCount(0);

    // 7. Delete the menu through the confirmation modal (cancel first, then confirm).
    await page.click('button:has-text("Delete menu")');
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('button:has-text("Delete menu")')).toBeVisible();

    await page.click('button:has-text("Delete menu")');
    await page.locator('div', { hasText: 'Delete this weekly menu?' }).locator('button.btn-danger').last().click();
    await expect(page.getByTestId('menu-empty-state')).toBeVisible();

    const afterDelete = await request.get(`/api/menus/${weekStart}`, { headers: USER_HEADERS });
    expect(afterDelete.status()).toBe(404);
  });
});
