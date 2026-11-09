# Tasks

## 1. Setup & Shared User Identity

- [x] 1.1 Add `@modelcontextprotocol/server` (`^2.4`), `@modelcontextprotocol/node` and `@modelcontextprotocol/express` (latest 2.x) and `zod` (`^4.2`) to `dependencies`, and `@modelcontextprotocol/client` (`^2.4`) to `devDependencies`. Verify that `npm install` succeeds and that `npx tsc --noEmit` still passes. Add `"types": ["node"]` to `tsconfig.json` if the SDK typings require it.
- [x] 1.2 Create `src/backend/infrastructure/http/resolve-user-id.ts` (`x-user-id` header or `default-local-user`) and replace the four inline lookups in `RecipeController` with it. Verify with unit tests for `resolveUserId`, and confirm that the existing recipe Supertest and E2E suites pass unchanged.

## 2. Weekly Menu Domain

- [x] 2.1 Add `MenuDomainError`, `InvalidMenuPayloadError`, `UnknownMenuRecipeError` and `MenuNotFoundError` in `src/backend/domain/errors/menu-domain.error.ts`. `MenuDomainError` extends `RecipeDomainError` (AGENTS.md R4). Verify that they compile and that `instanceof` works in a unit test.
- [x] 2.2 Implement the `WeekStart` value object (strict `YYYY-MM-DD`, round-trip check, Monday in UTC). Verify with unit tests for a valid Monday, a Wednesday, `11/09/2026` and `2026-02-30`.
- [x] 2.3 Implement the `MealDay` and `MealSlot` enums and the `MealEntry` value object (note trimmed, at most 200 characters). Verify with unit tests for unknown day/slot values and an over-long note.
- [x] 2.4 Implement the `WeeklyMenu` entity with `create()`: it enforces a unique `(day, slot)`, allows an empty `meals` list, and sorts entries by day, then slot. Verify with unit tests for the duplicate-slot error, an empty menu and a flexible-slot menu.

## 3. Menu Storage & Use Cases

- [x] 3.1 Define `WeeklyMenuRepositoryPort` (storage-agnostic, see design D7) and implement `JsonFileMenuRepository` (`data/menus.json`, optional `filePath`, scoped per user). Verify with unit tests against a temporary file, covering save/find/list/delete and per-user isolation.
- [x] 3.2 Implement `SaveWeeklyMenuService`. It validates the menu, resolves each `recipe_id` against the user's recipes, snapshots `recipe_title`, keeps `id` and `createdAt` on replace, sets `updatedAt`, and returns `{ menu, created }`. Verify with unit tests for create, replace (with `createdAt` kept), and an unknown or other-user recipe that leaves the stored menu unchanged.
- [x] 3.3 Implement `SetMenuSlotService`, which upserts or clears one slot, creates the menu if it is missing, and delegates to the save service. Verify with unit tests that only the target slot changes.
- [x] 3.4 Implement `GetWeeklyMenuService`, `ListWeeklyMenusService` (most recent first), `DeleteWeeklyMenuService`, and the `MenuView` mapper that adds `recipe_available`. Verify with unit tests that an entry whose recipe was deleted returns `recipe_available: false` with its saved title.
- [x] 3.5 Give each menu use case an interface in `application/ports` that its service implements, and type `MenuController` and the MCP server on those interfaces (AGENTS.md R5). Verify with `npm run typecheck` and `npm run check:architecture`.

## 4. Weekly Menu REST API

- [x] 4.1 Add `MenuController`, using `resolveUserId`, and register `GET /api/menus` and `GET/PUT/DELETE /api/menus/:weekStart` in `server.ts`. Map errors to 400/404/500, and return 201 or 200 on `PUT`. Verify with Supertest tests in `src/backend/tests/menu.server.spec.ts` for every status code in the spec, including per-user isolation through `x-user-id`. The `afterEach` teardown must delete the menus and recipes the tests created.

## 5. MCP Endpoint

- [x] 5.1 Create `src/backend/infrastructure/mcp/recipes-mcp.server.ts` with `createRecipesMcpServer({ userId, services })`: server name `mela-recipes`, the package version, and the `jsonResult`/`errorResult` helpers (design D5). Verify with a client test that the handshake reports the server name.
- [x] 5.2 Register the read-only tools `list_recipes` (filters `query`, `ingredient`, `max_prep_time_minutes` and `limit`, combined with AND) and `get_recipe`. Give them zod input/output schemas, descriptions written for LLMs, and `readOnlyHint`. Verify with client tests for no filters, combined filters, no matches (an empty list plus a message) and an unknown recipe (`isError`).
- [x] 5.3 Register `list_weekly_menus`, `get_weekly_menu` (returns `{ menu: null, message }` when there is no menu), `save_weekly_menu` (`destructiveHint`) and `set_menu_slot` (`recipe_id: null` clears the slot). Verify with client tests for success, a non-Monday `week_start`, an invented `recipe_id` (stored menu unchanged) and a single-slot swap, and check that later calls still succeed after error results.
- [x] 5.4 Register the `plan_weekly_menu` prompt, with optional `week_start` and `preferences` and a default of next week's Monday. Verify with a test that the returned message includes the preferences, the target week and the confirm-before-save guidance.
- [x] 5.5 Add assertions that the tool list is exactly the six spec tools, that the annotations match the spec, and that no tool creates, updates or deletes recipes. Verify that `npm run test` runs these tests against temporary-file repositories and leaves `data/` untouched.
- [x] 5.6 Mount `/mcp` in `server.ts` behind the `mcpGuard` middleware (production 404, foreign `Origin` 403, `localhostHostValidation()`). Handle `POST` statelessly, with a fresh server and transport per request and the `userId` from `resolveUserId`; `GET` and `DELETE` return 405 (design D2/D4). Verify with Supertest tests in `src/backend/tests/mcp.http.spec.ts` that `initialize` and `tools/list` succeed, that `GET` returns 405, a foreign origin returns 403 and production mode returns 404, and that `/api` routes are unaffected by the guard.
- [ ] 5.7 Write `docs/mcp-server.md`. It must cover:
  - starting the backend (`npm run dev:backend`)
  - connecting Claude Code (`claude mcp add --transport http mela-recipes http://localhost:3000/mcp`), Cursor, VS Code and the MCP Inspector
  - setting the optional `x-user-id` header
  - an example "plan my week" conversation
  - the development-only limitation and the follow-up roadmap (Postgres, then auth, then Vercel)

  Verify that the Claude Code command in the guide connects and that `/mcp` in Claude Code lists `mela-recipes` with its six tools.

## 6. Weekly Menu Web UI

- [x] 6.1 Add pure week helpers in `src/frontend/utils/week.ts` (`mondayOf`, `addDays`, `toIsoDate`, `formatRange`). Verify with Vitest unit tests that include a Sunday, a Monday and a month/year boundary.
- [x] 6.2 Add `fetchMenu` (a 404 becomes `null`), `saveMenu` and `deleteMenu` to `api.service.ts`, using the existing `parseResponse` and `x-user-id` conventions. Verify with `npx tsc --noEmit`.
- [x] 6.3 Build `src/frontend/components/WeeklyMenu.tsx` and add the matching styles in `index.css`. It needs:
  - a 7×4 grid
  - prev/next week controls with the date range
  - an empty-state message that mentions agents
  - a recipe select per cell that saves immediately, and a way to clear a cell
  - clickable titles for available recipes, and "no longer available" for deleted ones
  - a Delete menu action through `ConfirmModal`

  Verify manually with `npm run dev` that each scenario in the spec's Weekly Menu UI requirements behaves as written.
- [x] 6.4 Wire a `'menu'` view and a "📅 Weekly Menu" header button into `App.tsx`, with recipe clicks opening the existing detail view. Verify with `npm run build`.
- [x] 6.5 Add a Playwright E2E test (`e2e/weekly-menu.spec.ts`) that:
  - creates a recipe and opens Weekly Menu
  - assigns the recipe to a slot, reloads and checks it persisted
  - clears the slot, then deletes the menu through the modal
  - deletes the test recipe and menu in teardown

  Verify that `npm run test:e2e` passes.

## 7. Integration Check

- [ ] 7.1 Run `npm run test`, `npm run test:e2e` and `npm run build` locally, and confirm that the CI workflow passes on the PR.
- [x] 7.2 Do an end-to-end check with a real agent:
  - connect one real MCP client using `docs/mcp-server.md`
  - ask it to plan next week from existing recipes and approve the menu
  - open the Weekly Menu view and confirm it shows the agent's menu

## Workflow follow-up

- Archive the change with `/opsx:archive` after review and merge.
- Propose the follow-up changes in order: Postgres persistence (Supabase or Neon through the Vercel Marketplace), then user authentication (OAuth 2.1 for `/mcp`, removing the production guard), then the Vercel deployment.
