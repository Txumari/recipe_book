import { test, expect } from '@playwright/test';

test.describe('E2E Recipe Creation and In-Place Editing', () => {
  test('User can create a recipe and edit it in-place without errors', async ({ page }) => {
    // 1. Visit recipe app
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Recipe');

    // 2. Click "+ New Recipe"
    await page.click('button:has-text("New Recipe")');

    // 3. Fill out Creation Form
    const recipeTitle = `E2E Recipe ${Date.now()}`;
    await page.fill('input[placeholder="e.g. Gazpacho Andaluz"]', recipeTitle);
    await page.fill('textarea[placeholder="Brief overview of the dish..."]', 'A delicious E2E test recipe');
    await page.fill('input[type="number"] >> nth=0', '4'); // Servings
    await page.fill('input[type="number"] >> nth=1', '20'); // Prep time

    // Equipment
    await page.fill('input[placeholder="Tool name"]', 'Batidora');

    // Ingredient
    await page.fill('input[placeholder="Ingredient name"]', 'Tomate');
    await page.fill('input[type="number"] >> nth=2', '1'); // Amount

    // Step
    await page.fill('textarea[placeholder="Describe this step in detail..."]', 'Triturar todo');

    // Save
    await page.click('button:has-text("Save Recipe")');

    // 4. Verify Recipe Detail view opens
    await expect(page.locator('.detail-header h1')).toHaveText(recipeTitle);

    // 5. Click "✏️ Edit Recipe" button
    await page.click('button:has-text("Edit Recipe")');

    // 6. Verify in-place edit mode is active
    await expect(page.locator('h2')).toContainText('Editing Recipe In Place');

    // Modify Title & Prep Time in-place
    const updatedTitle = `${recipeTitle} (Updated)`;
    await page.fill('form input[type="text"] >> nth=0', updatedTitle);
    await page.fill('form input[type="number"] >> nth=1', '35');

    // 7. Click "💾 Save Changes"
    await page.click('button:has-text("Save Changes")');

    // 8. Verify updated title renders in Detail view without network or JSON errors
    await expect(page.locator('.detail-header h1')).toHaveText(updatedTitle);
    await expect(page.locator('.detail-header')).toContainText('35 mins prep');
  });
});
