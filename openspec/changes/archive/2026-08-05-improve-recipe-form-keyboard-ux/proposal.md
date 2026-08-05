## Why

Editing and creating recipes is currently cumbersome because adding or reordering ingredients, equipment, or steps requires manual work. Users should be able to smoothly add new items, reorder items up/down, move between fields using keyboard shortcuts (`Enter`, `Tab`, `Shift+Enter`), and save forms (`Cmd+Enter` / `Ctrl+Enter`) without taking their hands off the keyboard.

## What Changes

- **Visual Reordering of Ingredients and Steps**: Add `▲` / `▼` reorder controls (and keyboard `Alt+Up` / `Alt+Down` shortcuts) on each ingredient and step row, automatically updating 1-indexed step numbers upon reordering.
- **Automatic Row Creation on Enter/Tab**: Pressing `Enter` or `Tab` in the final field of an ingredient, equipment, or step row automatically appends a new item row and shifts focus to its first input.
- **Backspace Empty Row Removal**: Pressing `Backspace` on an empty ingredient, equipment, or step field removes the empty row and moves focus to the previous item.
- **Global Save Shortcut**: Pressing `Cmd+Enter` (macOS) or `Ctrl+Enter` (Windows/Linux) anywhere inside `RecipeForm` or `RecipeDetail` inline editor triggers form submission and saves changes.
- **Visual Focus & Usability Polish**: Enhanced input focus rings, visible keyboard shortcut hints (e.g. `↵ Press Enter to add next item`), and smooth transitions.

## Capabilities

### New Capabilities

### Modified Capabilities
- `recipe-creation`: Enhance recipe creation and editing forms with visual reordering controls, fluid keyboard navigation, automatic row appending, and keyboard shortcuts.

## Impact

- `src/frontend/components/RecipeForm.tsx`: Add reorder controls (`moveIngredient`, `moveStep`), keyboard event handlers (`onKeyDown`), and ref focus management.
- `src/frontend/components/RecipeDetail.tsx`: Add reorder controls (`moveIngredient`, `moveStep`), keyboard event handlers (`onKeyDown`), and ref focus management.
- `e2e/recipe-editing.spec.ts`: Add E2E tests verifying item reordering, keyboard-driven row creation, and form submission.
