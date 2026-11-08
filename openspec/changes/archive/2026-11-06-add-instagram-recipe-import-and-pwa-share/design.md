# Design

## Context

Mela Recipes currently uses a Clean/Hexagonal Architecture on the backend (`src/backend/domain`, `src/backend/application`, `src/backend/infrastructure`) with an Express HTTP server (`server.ts`) persisting recipes to `data/recipes.json`, and a Vite + React 18 SPA frontend (`src/frontend`).
See `proposal.md` for motivation and `specs/recipe-import/spec.md` and `specs/recipe-creation/spec.md` for behavioral requirements.

## Goals / Non-Goals

**Goals:**
- Preserve Hexagonal boundaries by introducing ports (`RecipeParserPort`, `ContentExtractorPort`) in the application layer and concrete adapters in the infrastructure layer.
- Support multiple LLM providers out of the box (Google Gemini, OpenAI, Groq, and local Ollama via OpenAI-compatible endpoints) using Node's built-in `fetch` without adding heavy third-party SDK dependencies.
- Guarantee zero-cost and offline resilience via a deterministic local `HeuristicRecipeParserAdapter` fallback that maps Spanish and English culinary text into valid `CreateRecipeDto` structures.
- Enable seamless mobile and desktop sharing via an in-app import panel, URL query parameters (`?shareUrl`, `?shareText`), and a PWA Web Share Target (`public/manifest.webmanifest` + `public/sw.js`).
- Allow local Wi-Fi testing from mobile devices by binding the Vite dev server to `0.0.0.0` while keeping Playwright CI compatibility on `127.0.0.1`.

**Non-Goals:**
- Extracting recipes from video audio tracks (speech-to-text) or OCR on video frames / screenshots in this iteration (the parser port is designed so image/screenshot support can be added later).
- Bypassing Instagram login walls using personal user session cookies (to avoid account ban risks).
- One-click blind saving without user review (imported recipes always pre-fill `RecipeForm` as a draft so the user can verify quantities and steps before saving).

## Decisions

### 1. Draft Pre-Fill Flow Instead of Direct Persistence on Parse
- **Decision**: `POST /api/recipes/parse` is a stateless parsing endpoint that returns a `ParsedRecipeDraftDto` (matching `CreateRecipeDto` plus metadata such as `parser_used: 'gemini' | 'openai-compatible' | 'heuristic'` and optional `extraction_warning?: string`). The frontend populates `RecipeForm` with this draft, and the user saves via the existing `POST /api/recipes` endpoint.
- **Rationale**: Social media captions frequently omit `servings` or `prep_time_minutes`, or use ambiguous ingredient quantities (*"sal al gusto"*). Pre-filling `RecipeForm` lets the parser provide smart defaults (e.g., `servings: 2`, `prep_time_minutes: 20`, `1 pinch`) while giving the user full control before domain persistence.
- **Alternatives considered**: Saving directly inside `POST /api/recipes/parse`. Rejected because title collisions, missing metadata, or blocked Instagram captions would either fail validation or pollute `data/recipes.json` with unreviewed guesses.

### 2. Composite Multi-Provider LLM Adapter with Local Heuristic Fallback
- **Decision**: Implement `RecipeParserPort` using a `CompositeRecipeParserAdapter` that chains providers in priority order:
  1. `GeminiRecipeParserAdapter` — active when `GEMINI_API_KEY` is set (calls Gemini `generateContent` REST API with `responseMimeType: "application/json"` and a strict schema enforcing `VALID_INGREDIENT_UNITS`).
  2. `OpenAiCompatibleRecipeParserAdapter` — active when `OPENAI_API_KEY`, `GROQ_API_KEY`, or `LLM_BASE_URL` is set (calls `/chat/completions` with `response_format: { type: "json_object" }`, supporting OpenAI, Groq, OpenRouter, and local Ollama).
  3. `HeuristicRecipeParserAdapter` — always active as the final fallback. Uses bilingual (Spanish/English) regular expressions and section detection (`Ingredientes` / `Ingredients`, `Pasos` / `Preparación` / `Steps`, time/servings patterns, and unit synonym normalization such as `g`/`gramos` → `grams`, `cda`/`cucharada` → `tbsp`, `cdta` → `tsp`, `diente` → `clove`, `chorrito` → `splash`, `pizca`/`al gusto` → `pinch`).
- **Rationale**: Gives the user plug-and-play support for free-tier cloud LLMs (Gemini, Groq), paid APIs (OpenAI), or local models (Ollama), while ensuring unit/E2E tests and unconfigured local setups work deterministically at `$0` cost.

### 3. Best-Effort URL Metadata Extraction (`HttpContentExtractorAdapter`)
- **Decision**: When `POST /api/recipes/parse` receives a `url`:
  - If `text` is also provided (e.g., Android Share Sheet sometimes passes both text and URL, or the user pasted both), parse `text` directly and keep `url` as `source_url`.
  - If only `url` is provided, `HttpContentExtractorAdapter` fetches the URL with a short timeout (5s) and extracts caption text from OpenGraph (`og:description`, `og:title`), `<meta name="description">`, or JSON-LD (`articleBody` / `description`), cleaning Instagram boilerplate prefix (`"X likes, Y comments - username on Date: \"...\""`).
  - If the remote server blocks the request or returns no usable recipe text, `ParseRecipeService` does not throw a 500 error; instead, it returns a minimal draft with `source_url` set and `extraction_warning` explaining that the post text could not be fetched automatically so the user can paste the caption/comment text into the box.
- **Rationale**: Instagram frequently blocks anonymous server IPs or places recipes in comments. Graceful degradation ensures `source_url` is never lost and the user is guided smoothly to paste the caption/comment.

### 4. Generic `source_url` Domain Field
- **Decision**: Add optional `source_url?: string` to `RecipeProps`, `Recipe`, `CreateRecipeDto`, and frontend types. Validate in `Recipe.create()` that if `source_url` is provided and non-empty after trimming, it parses via `new URL(url)` with protocol `http:` or `https:`.
- **Rationale**: Keeping the field name generic (`source_url` rather than `instagram_url`) supports Instagram, TikTok, YouTube, and food blogs uniformly.

### 5. PWA Web Share Target + Query Parameter Routing
- **Decision**:
  - Add `public/manifest.webmanifest` with `display: "standalone"` and a `share_target` configuration (`action: "/"`, `method: "GET"`, `params: { title: "shareTitle", text: "shareText", url: "shareUrl" }`).
  - Note: Android apps (including Instagram) often pass the shared URL inside the `text` parameter rather than `url`. On startup in `App.tsx`, inspect `window.location.search` for `shareUrl`, `shareText`, and `shareTitle`. If `shareText` contains an `http://` or `https://` URL and `shareUrl` is empty, extract the URL into `source_url` and keep any remaining text as caption text.
  - Clean the URL query string via `window.history.replaceState({}, '', window.location.pathname)` after reading so refreshing the page doesn't re-trigger the import.
  - Update `vite.config.ts` `server.host` from `'127.0.0.1'` to `'0.0.0.0'` so both `http://127.0.0.1:5173` (Playwright CI) and `http://<local-wifi-ip>:5173` (mobile phone on local Wi-Fi) work simultaneously.

## Risks / Trade-offs

- **[Risk] Instagram blocks server-side HTML fetching for public posts** → **Mitigation**: `HttpContentExtractorAdapter` parses `og:description` when available and gracefully returns `extraction_warning` with `source_url` pre-filled when blocked, prompting the user to paste the copied caption/comment text in one tap.
- **[Risk] LLM returns malformed JSON or unsupported ingredient units** → **Mitigation**: All LLM outputs are normalized through a unit-mapping sanitizer (falling back to `'unit'` for unrecognized units and clamping amounts/servings/prep time to positive numbers) before returning, and any unrecoverable parse error falls back to `HeuristicRecipeParserAdapter`.
- **[Risk] Existing saved recipes in `data/recipes.json` do not have `source_url`** → **Mitigation**: `source_url` is optional (`undefined` when omitted), so backward compatibility with existing JSON records and tests is 100% preserved.
