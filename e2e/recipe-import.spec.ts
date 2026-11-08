import { test, expect } from '@playwright/test';

test.describe('E2E Recipe Import from Instagram / Share Target', () => {
  test('User can import a recipe from an Instagram caption into RecipeForm, save it, and view the source link', async ({ page }) => {
    await page.goto('/');

    // 1. Open the creation form
    await page.click('button:has-text("New Recipe")');
    await expect(page.locator('h2')).toHaveText('Create New Recipe');

    // 2. Provide an Instagram URL and paste caption text, then parse
    const instagramUrl = 'https://www.instagram.com/p/e2eImportCaption/';
    await page.fill('input[placeholder="Instagram URL (e.g. https://www.instagram.com/p/ABC123/)"]', instagramUrl);
    await page.fill('textarea[placeholder="Paste caption text (ingredients/steps)..."]', [
      'Creamy Garlic Pasta',
      'Ingredients',
      '2 tbsp butter',
      '1 cup pasta',
      'Steps',
      'Melt butter in pan.',
      'Cook pasta.',
    ].join('\n'));

    await page.click('button:has-text("Parse Recipe")');

    // 3. Draft is pre-filled into the form
    const titleInput = page.locator('input[placeholder="e.g. Classic Gazpacho Andaluz"]');
    await expect(titleInput).toHaveValue('Creamy Garlic Pasta');

    // 4. Submit the pre-filled draft
    await page.locator('input[placeholder="e.g. Classic Gazpacho Andaluz"]').press('Control+Enter');

    // 5. Draft review lands on the recipe detail view with the clickable source link
    await expect(page.locator('.detail-header h1')).toHaveText('Creamy Garlic Pasta');
    const sourceLink = page.locator(`a[href="${instagramUrl}"]`);
    await expect(sourceLink).toBeVisible();
    await expect(sourceLink).toHaveAttribute('href', instagramUrl);

    // 6. Clean up the created test recipe
    await page.click('button:has-text("Delete")');
    await page.click('button:has-text("Delete Recipe")');
    await expect(page.locator('h1')).toContainText('Recipe Cookbook');
  });

  test('App opens the pre-filled import flow via shareText query parameters', async ({ page }) => {
    const instagramUrl = 'https://www.instagram.com/p/e2eShareTest/';
    await page.goto(`/?shareText=${encodeURIComponent(instagramUrl)}`);

    // 1. Share intent should switch to the creation view with the source URL pre-filled
    await expect(page.locator('h2')).toHaveText('Create New Recipe');
    await expect(page.locator('input[placeholder="Instagram URL (e.g. https://www.instagram.com/p/ABC123/)"]')).toHaveValue(instagramUrl);

    // 2. Query string should have been cleaned from the address bar
    await expect(page).toHaveURL('http://127.0.0.1:5173/');
  });
});
