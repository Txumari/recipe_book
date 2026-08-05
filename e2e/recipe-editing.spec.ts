import { test, expect } from '@playwright/test';

test.describe('E2E Recipe Creation, Editing, and Deletion', () => {
  test('User can create, edit in-place, and delete a recipe with modal confirmation', async ({ page }) => {
    // 1. Visit recipe app
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Recipe');

    // 2. Click "+ New Recipe"
    await page.click('button:has-text("New Recipe")');

    // 3. Fill out Creation Form
    const recipeTitle = `E2E Full Flow ${Date.now()}`;
    await page.fill('input[placeholder="e.g. Gazpacho Andaluz"]', recipeTitle);
    await page.fill('textarea[placeholder="Brief overview of the dish..."]', 'Full flow test recipe');
    await page.fill('input[type="number"] >> nth=0', '4'); // Servings
    await page.fill('input[type="number"] >> nth=1', '20'); // Prep time

    await page.fill('input[placeholder="Tool name"]', 'Batidora');
    await page.fill('input[placeholder="Ingredient name"]', 'Tomate');
    await page.fill('input[type="number"] >> nth=2', '1'); // Amount
    await page.fill('textarea[placeholder="Describe this step in detail..."]', 'Triturar todo');

    await page.click('button:has-text("Save Recipe")');

    // 4. Verify Recipe Detail view opens
    await expect(page.locator('.detail-header h1')).toHaveText(recipeTitle);

    // 5. Click "✏️ Edit Recipe" button
    await page.click('button:has-text("Edit Recipe")');
    await expect(page.locator('h2')).toContainText('Editing Recipe In Place');

    // Modify Title & Save
    const updatedTitle = `${recipeTitle} (Updated)`;
    await page.fill('form input[type="text"] >> nth=0', updatedTitle);
    await page.click('button:has-text("Save Changes")');

    await expect(page.locator('.detail-header h1')).toHaveText(updatedTitle);

    // 6. Click "🗑️ Delete" in Detail view
    await page.click('button:has-text("Delete") >> nth=0');

    // 7. Verify Confirmation Modal appears
    await expect(page.locator('h3')).toContainText('Delete Recipe');
    await expect(page.locator('p')).toContainText(updatedTitle);

    // 8. Confirm deletion in modal
    await page.click('button:has-text("Delete Recipe") >> nth=1');

    // 9. Verify returned to Gallery view and recipe is no longer displayed
    await expect(page.locator('h1')).toContainText('Recipe Cookbook');
    await expect(page.locator('.recipe-grid')).not.toContainText(updatedTitle);
  });
});
