## 1. Creation Form Keyboard & Reorder UX (`RecipeForm.tsx`)

- [x] 1.1 Add reorder controls (`▲` Move Up, `▼` Move Down) and `Alt+Up`/`Alt+Down` keyboard reordering for ingredients and steps in `src/frontend/components/RecipeForm.tsx`.
- [x] 1.2 Add `onKeyDown` handlers for `Enter`, `Tab`, `Backspace`, and `Cmd+Enter` in `src/frontend/components/RecipeForm.tsx`.
- [x] 1.3 Implement auto-row appending and focus traversal for equipment, ingredients, and steps in `src/frontend/components/RecipeForm.tsx`.

## 2. In-Place Edit Form Keyboard & Reorder UX (`RecipeDetail.tsx`)

- [x] 2.1 Add reorder controls (`▲` Move Up, `▼` Move Down) and `Alt+Up`/`Alt+Down` keyboard reordering for ingredients and steps in `src/frontend/components/RecipeDetail.tsx`.
- [x] 2.2 Add `onKeyDown` handlers for `Enter`, `Tab`, `Backspace`, and `Cmd+Enter` in `src/frontend/components/RecipeDetail.tsx`.
- [x] 2.3 Implement auto-row appending and focus traversal for equipment, ingredients, and steps in `src/frontend/components/RecipeDetail.tsx`.

## 3. UI Styling & Keyboard Hints

- [x] 3.1 Add reorder button styles, keyboard shortcut badges, and CSS focus enhancements in `src/frontend/styles/index.css`.

## 4. E2E Testing & Verification

- [x] 4.1 Add Playwright E2E test scenarios for reordering items (`▲`/`▼`), keyboard-driven row creation, and `Cmd+Enter` form submission in `e2e/recipe-editing.spec.ts`.
- [x] 4.2 Run unit, integration, and E2E tests, and verify Vite production build.
