# Tasks

## 1. Domain & Application Support for `source_url`

- [x] 1.1 Add optional `source_url?: string` to `RecipeProps`, `Recipe` entity (`src/backend/domain/entities/recipe.entity.ts`), `CreateRecipeDto` (`src/backend/application/dtos/recipe.dto.ts`), and shared types (`src/recipe/recipe.types.ts`), validating that any non-empty `source_url` is a valid `http://` or `https://` URL; verify by running `npm run test`.
- [x] 1.2 Update `CreateRecipeService` and `UpdateRecipeService` to pass `source_url` through to `Recipe.create()` and add unit/integration tests in `src/backend/tests/recipe.service.spec.ts` and `src/backend/tests/server.spec.ts` covering valid and invalid `source_url` values; verify with `npm run test`.

## 2. Backend Recipe Import Ports, Parsers & HTTP Endpoint

- [x] 2.1 Define `RecipeParserPort`, `ContentExtractorPort`, `ParseRecipeRequestDto`, and `ParsedRecipeDraftDto` in `src/backend/application/` and implement `ParseRecipeService` (`src/backend/application/use-cases/parse-recipe.service.ts`); verify TypeScript compilation passes.
- [x] 2.2 Implement `HeuristicRecipeParserAdapter` (`src/backend/infrastructure/parsers/heuristic-recipe-parser.adapter.ts`) supporting bilingual (Spanish/English) caption parsing, ingredient quantity/unit normalization to `VALID_INGREDIENT_UNITS`, equipment detection, and sequential step numbering, and verify with unit tests in `src/backend/tests/`.
- [x] 2.3 Implement `GeminiRecipeParserAdapter`, `OpenAiCompatibleRecipeParserAdapter` (supporting `OPENAI_API_KEY`, `GROQ_API_KEY`, `LLM_BASE_URL`), and `CompositeRecipeParserAdapter` in `src/backend/infrastructure/parsers/`, plus `HttpContentExtractorAdapter` for best-effort URL caption extraction with graceful fallback; verify with unit tests covering LLM responses and automatic fallback to heuristic parsing.
- [x] 2.4 Expose `POST /api/recipes/parse` in `RecipeController` (`src/backend/infrastructure/http/recipe.controller.ts`) and `server.ts`, and add HTTP integration tests in `src/backend/tests/server.spec.ts` verifying text parsing, URL metadata extraction, graceful fallback, and empty payload 400 rejection via `npm run test`.

## 3. Frontend Import UI, `source_url` Display & PWA Share Target

- [x] 3.1 Update `src/frontend/services/api.service.ts` with `source_url?: string` on `Recipe` and `CreateRecipeDto` and add `parseRecipe(payload: { url?: string; text?: string })`; verify frontend build with `npm run build`.
- [x] 3.2 Update `RecipeForm.tsx` and `RecipeDetail.tsx` to include an "Import from Instagram / Link / Text" panel that pre-fills the form draft (including `source_url` and any extraction warning), allow editing `source_url`, and render a clickable source link in `RecipeDetail`; verify with `npm run build`.
- [x] 3.3 Add `public/manifest.webmanifest` (with `share_target` mapping to `/?shareUrl=...&shareText=...&shareTitle=...`) and `public/sw.js`, register the manifest/service worker in `index.html` and `main.tsx`, handle `?shareUrl` / `?shareText` query parameters in `App.tsx` to open the pre-filled import flow, and update `vite.config.ts` `server.host` to `'0.0.0.0'` for local Wi-Fi phone testing; verify `npm run build` succeeds.
- [x] 3.4 Add Playwright E2E tests in `e2e/` covering importing a recipe from an Instagram URL/caption into `RecipeForm`, reviewing and saving it with `source_url`, viewing the clickable `source_url` link in `RecipeDetail`, and opening the app via `/?shareText=` query parameters (with test recipe cleanup in teardown); verify by running `npm run test:all`.
