# Proposal

## Why

Users frequently discover recipes on social platforms like Instagram (in post descriptions or comments), but manually copying and re-typing unstructured captions into Mela Recipes' strict domain model (`servings`, `prep_time_minutes`, structured `ingredients` with valid measurement units, sequential `steps`, and `equipment`) is tedious and error-prone—especially on mobile. Adding a smart recipe import pipeline and Progressive Web App (PWA) Share Target allows users to share an Instagram link or paste raw post text and immediately get a properly formatted draft recipe ready to review and save, while preserving the original source link.

## What Changes

- **Add `source_url` to the Recipe domain and UI**:
  - Extend `Recipe`, `CreateRecipeDto`, and update flows to accept an optional `source_url` (validated as an `http://` or `https://` URL when provided).
  - Display a clickable source link in `RecipeDetail` and allow editing `source_url` in `RecipeForm` and `RecipeDetail`'s inline edit mode.
- **Introduce Backend Recipe Import & Parsing (`POST /api/recipes/parse`)**:
  - Accept `{ url?: string, text?: string }` payloads.
  - When a `url` is provided (e.g., an Instagram post/reel link), attempt best-effort public metadata/caption extraction (`og:description`, meta tags, or oEmbed) while retaining `source_url` even if the platform blocks scraping or the recipe lives in a comment.
  - Parse unstructured recipe text into a structured `CreateRecipeDto` draft using a Hexagonal `RecipeParserPort` with a **multi-provider LLM strategy** (supporting Gemini via `GEMINI_API_KEY` and OpenAI-compatible providers such as OpenAI, Groq, or Ollama via `OPENAI_API_KEY` / `GROQ_API_KEY` / `LLM_BASE_URL`) and an automatic **local heuristic rule-based fallback** when no API key is configured or an external LLM call fails.
- **Add Frontend "Import from Link or Text" Flow**:
  - Add an import panel to `RecipeForm` (and quick-access trigger from the gallery/header) where users can paste an Instagram URL and/or raw post caption/comment text, parse it, and pre-fill the recipe form as an editable draft before saving.
- **Add PWA & Mobile Web Share Target Support**:
  - Add `public/manifest.webmanifest` (configured with `share_target` mapping shared URLs/text to `/?shareUrl=...&shareText=...`) and a lightweight service worker so Mela Recipes can be installed on mobile devices and receive shared posts directly from the native Android Share Sheet (or iOS Shortcuts).
  - Handle `?shareUrl` and `?shareText` query parameters in `App.tsx` to automatically open `RecipeForm` and trigger the import flow.
  - Update `vite.config.ts` server host binding (`0.0.0.0`) so mobile devices on the same local Wi-Fi network can access and test the app during development while keeping IPv4 loopback (`127.0.0.1`) working for Playwright CI.

## Capabilities

### New Capabilities
- `recipe-import`: Importing and parsing recipes from shared URLs (such as Instagram posts/reels) or unstructured text captions/comments into structured recipe drafts via multi-provider LLM adapters with a local rule-based fallback, including mobile PWA Web Share Target integration.

### Modified Capabilities
- `recipe-creation`: Support optional `source_url` attribute across recipe creation, updating, domain validation, and UI detail/edit views, and allow pre-filling the creation form from an imported draft.

## Impact

- **Backend Domain & Application**:
  - `src/backend/domain/entities/recipe.entity.ts` & `src/recipe/recipe.types.ts` (add `source_url?: string` and URL format validation).
  - `src/backend/application/dtos/recipe.dto.ts` (add `source_url?: string` and `ParseRecipeRequestDto` / `ParsedRecipeDraftDto`).
  - New ports & use cases in `src/backend/application/ports/` and `src/backend/application/use-cases/` (`RecipeParserPort`, `ContentExtractorPort`, `ParseRecipeService`).
- **Backend Infrastructure**:
  - New adapters in `src/backend/infrastructure/` for URL caption extraction, multi-provider LLM parsing (`GeminiRecipeParserAdapter`, `OpenAiCompatibleRecipeParserAdapter`), composite fallback orchestration, and `HeuristicRecipeParserAdapter`.
  - `src/backend/infrastructure/http/recipe.controller.ts` & `server.ts` (expose `POST /api/recipes/parse`).
- **Frontend & PWA**:
  - `src/frontend/services/api.service.ts` (`parseRecipe` client method and `source_url` types).
  - `src/frontend/App.tsx`, `src/frontend/components/RecipeForm.tsx`, and `src/frontend/components/RecipeDetail.tsx`.
  - `index.html`, `public/manifest.webmanifest`, `public/sw.js`, and `vite.config.ts`.
- **Dependencies**:
  - Zero new runtime npm packages required (uses native Node `fetch` for LLM HTTP APIs and metadata fetching).
