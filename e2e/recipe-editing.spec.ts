import { test, expect } from '@playwright/test';

test.describe('E2E Recipe Creation, Editing, Keyboard Navigation & Reordering', () => {
  test('User can create, edit, reorder steps, and delete a recipe', async ({ page }) => {
    // 1. Visit recipe app
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Recipe');

    // 2. Click "+ New Recipe"
    await page.click('button:has-text("New Recipe")');

    // 3. Fill out Creation Form with keyboard-driven step creation
    const recipeTitle = `E2E Keyboard UX ${Date.now()}`;
    await page.fill('input[placeholder="e.g. Classic Gazpacho Andaluz"]', recipeTitle);
    await page.fill('textarea[placeholder="Brief notes, flavor profile, or origin..."]', 'Keyboard navigation test');
    await page.fill('input[type="number"] >> nth=0', '4'); // Servings
    await page.fill('input[type="number"] >> nth=1', '15'); // Prep time

    await page.fill('input[placeholder="Ingredient name (e.g. Diente de ajo)"]', 'Tomate');
    await page.fill('input[type="number"] >> nth=2', '1');

    // Fill Step 1 and press Enter to auto-create Step 2
    const step1Textarea = page.locator('textarea[data-step-instruction]').first();
    await step1Textarea.fill('Paso 1: Lavar tomates');
    await step1Textarea.press('Enter');

    // Verify Step 2 textarea automatically appeared and focused
    const step2Textarea = page.locator('textarea[data-step-instruction]').nth(1);
    await expect(step2Textarea).toBeVisible();
    await step2Textarea.fill('Paso 2: Cortar a trozos');

    // Submit form via Cmd+Enter / Ctrl+Enter shortcut
    await step2Textarea.press('Control+Enter');

    // 4. Verify Recipe Detail view opens
    await expect(page.locator('.detail-header h1')).toHaveText(recipeTitle);

    // 5. Click "✏️ Edit Recipe" button
    await page.click('button:has-text("Edit Recipe")');
    await expect(page.locator('h2')).toContainText('Editing Recipe In Place');

    // Test Step Reordering: Move Step 2 up to become Step 1
    const moveUpBtn = page.locator('button.btn-reorder[title*="Move Up"]').nth(1);
    await moveUpBtn.click();

    // Verify step order swapped
    const firstStepTextarea = page.locator('textarea[data-step-instruction]').first();
    await expect(firstStepTextarea).toHaveValue('Paso 2: Cortar a trozos');

    // Save changes
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('.steps-list li').first()).toContainText('Paso 2: Cortar a trozos');

    // 6. Delete recipe
    await page.click('button:has-text("Delete") >> nth=0');
    await page.click('button:has-text("Delete Recipe") >> nth=1');

    await expect(page.locator('h1')).toContainText('Recipe Cookbook');
  });
});
