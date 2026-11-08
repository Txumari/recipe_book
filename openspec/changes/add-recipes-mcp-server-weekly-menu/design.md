# Design

## Context

- **Backend layout.** The backend is hexagonal: `domain/` (entities, value objects, errors), `application/` (ports and use-case services) and `infrastructure/` (Express controller and server, JSON file repository). Use cases receive `userId` explicitly. `RecipeController` reads it from `x-user-id` (falling back to `default-local-user`), copied into each of its four handlers. The frontend always sends `default-local-user`.
- **Storage.** `JsonFileRecipeRepository` stores recipes in `data/recipes.json` and re-reads the file on every call. A serverless host (Vercel) has no persistent disk, so JSON storage is local-dev only. Postgres replaces it in a follow-up change (see proposal.md, "Follow-up changes").
- **Running the backend.** The backend runs through `tsx`, with no compile step. `server.ts` exports `app` and only calls `listen` when `NODE_ENV !== 'test'`, so Supertest can use the app directly.
- **Frontend.** A single `App.tsx` drives the screens with a `view` state machine (`gallery | form | detail`). The `api.service.ts` client parses responses safely. Vite proxies `/api` to port 3000.
- **CI.** CI runs `npm run test` (Vitest), `npm run test:e2e` (Playwright) and `npm run build` on Node 24.
- **MCP SDK.** The stable MCP TypeScript SDK line is **v2** (2.4.x). It implements the 2026-07-28 MCP spec, in which Streamable HTTP is stateless by default. It is split into these packages:
  - `@modelcontextprotocol/server` (`McpServer`), which requires `zod` ^4.2
  - `@modelcontextprotocol/node` (`NodeStreamableHTTPServerTransport`)
  - `@modelcontextprotocol/express`, which provides `localhostHostValidation()`, `hostHeaderValidation()`, and, for later, `requireBearerAuth()` and `mcpAuthMetadataRouter()`
  - `@modelcontextprotocol/client`

  The v1 `@modelcontextprotocol/sdk` package is the previous line.

Requirements: `specs/weekly-menu` and `specs/recipes-mcp-server`.

## Goals / Non-Goals

**Goals:**
- One implementation of the menu rules, shared by the REST API and MCP, with no duplicated validation.
- An `/mcp` endpoint that looks the same locally and on a serverless host. Adding auth later means adding middleware, not reworking the endpoint.
- A single seam where the user identity is decided, so it can be replaced by token-based identity later.
- Storage reached only through ports, so a Postgres adapter can replace the JSON files without changes elsewhere.

**Non-Goals:**
- Postgres adapters, OAuth or token validation, and Vercel configuration (`vercel.json`, serverless entry point). These are follow-up changes.
- Hardening JSON-file concurrency. It is local-dev storage with a single backend process.
- MCP resources, sampling, elicitation or server-initiated notifications. Only tools and one prompt.

## Decisions

### D1. Serve MCP from the Express backend at `/mcp`, in-process
`src/backend/infrastructure/mcp/` is a new infrastructure adapter, alongside the HTTP controllers. It uses the same repository instances and use-case services that `server.ts` wires up, so REST and MCP share storage and rules by construction.
- *Alternative: a separate stdio process.* Rejected. It cannot run on a hosted server, and it would require two processes to share data files.
- *Alternative: an MCP process that calls the REST API.* Rejected. It is an extra network hop with duplicated error mapping, and there is no benefit once both live in one backend.

### D2. Stateless Streamable HTTP with the MCP SDK v2
- **Packages.** Use `@modelcontextprotocol/server`, `@modelcontextprotocol/node` and `@modelcontextprotocol/express` (pinned `^2.4` / `^2.0`), plus `zod` `^4.2` as dependencies. Add `@modelcontextprotocol/client` as a devDependency for tests.
- **Per-request lifecycle.** Each `POST /mcp` creates a fresh `McpServer`, using the factory from D5, and a `NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined })`. It connects them, runs `handleRequest(req, res, req.body)`, and closes both when the response finishes. `GET` and `DELETE /mcp` return 405, because there are no sessions and no server-initiated streams.
- **Why stateless.** It fits serverless (any instance answers any request) and the current spec default. Building a server per request is cheap, since tools are registered in memory and the repositories are shared singletons.
- *Alternative: SDK v1 (`@modelcontextprotocol/sdk` 1.32).* Rejected. v2 is the stable line, and its Express package ships the host validation and bearer-auth helpers that the auth follow-up needs.
- *Alternative: Vercel's `mcp-handler`.* Rejected. It is aimed at Next.js and would need a Request/Response adapter for Express. The official adapter covers what we need.

### D3. Single user-identity resolution point
Add `infrastructure/http/resolve-user-id.ts`, exporting `resolveUserId(req): string`. It returns `x-user-id` when present and non-empty, and `default-local-user` otherwise.
- `RecipeController`, `MenuController` and the `/mcp` handler all call it.
- The `/mcp` handler passes the `userId` into the server factory. Tools read it from that closure and never from their arguments.
- In the auth follow-up, `resolveUserId` becomes "take `sub` from the verified token", with `requireBearerAuth` set up in front of `/api` and `/mcp`. No tool or use case changes.
- Recipe REST behaviour does not change. This is a refactor of the four existing handlers, covered by the existing tests.

### D4. Development-only guard on `/mcp`
A small `mcpGuard` middleware is mounted only on `/mcp`, in this order:
1. **Production check.** If `NODE_ENV === 'production'`, it returns 404 `{ error: 'MCP endpoint is not enabled' }`. This keeps an unauthenticated endpoint from going live by accident during the Vercel follow-up. The auth change removes the check.
2. **Origin check.** If an `Origin` header is present and its hostname is not `localhost` or `127.0.0.1`, it returns 403. The MCP spec requires servers to validate `Origin`; this protects against DNS rebinding and browser-originated requests.
3. **Host check.** `localhostHostValidation()` from `@modelcontextprotocol/express` validates the `Host` header.

The guard is not applied to `/api`, so the REST API behaves as before.

### D5. MCP server factory
`createRecipesMcpServer({ userId, services })` returns a configured `McpServer`. `services` is a bag of the use cases and the recipe repository, which keeps the factory easy to test.
- **Handlers.** Handlers are thin: they call the use cases and wrap the output with `jsonResult(data)`, which returns `{ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: data }`.
- **Errors.** `MenuDomainError` and `RecipeDomainError` become `{ isError: true, content: [{ type: 'text', text: message }] }`. Unexpected errors are logged with `console.error` and returned as a generic error result. Bad inputs are rejected by the SDK's schema validation as error results.
- **Output shape.** `outputSchema` is declared for every tool. Because `structuredContent` must be an object, list tools return `{ recipes: [...] }` and `{ menus: [...] }`. `get_weekly_menu` returns `{ menu: null, message }` when there is no menu.
- **Annotations.**
  - `list_recipes`, `get_recipe`, `list_weekly_menus` and `get_weekly_menu` are read-only (`readOnlyHint: true`).
  - `save_weekly_menu` is `destructiveHint: true, idempotentHint: true`.
  - `set_menu_slot` is `destructiveHint: false, idempotentHint: true`.
- **Descriptions.** Tool descriptions are written for LLMs. They say that IDs must come from `list_recipes`, that `week_start` must be a Monday, and they list the allowed day and slot values.
- **Planning prompt.** The `plan_weekly_menu` prompt builds one user message. It defaults `week_start` to next week's Monday.

### D6. A menu is a flat list of meal entries
Stored shape (local dev: `data/menus.json`, an array):
```json
{ "id": "menu-…", "userId": "default-local-user", "week_start": "2026-11-09",
  "meals": [ { "day": "monday", "slot": "lunch", "recipe_id": "recipe-…",
               "recipe_title": "Tortilla", "note": "leftovers" } ],
  "createdAt": "…", "updatedAt": "…" }
```
- **Why flat.** A flat list gives LLMs a simpler tool schema, puts uniqueness on the `(day, slot)` pair, and maps directly to a future `menu_meals` table with a unique `(menu_id, day, slot)`.
- **Titles and availability.** `recipe_title` is a snapshot taken at save time, so menus stay readable after a recipe is deleted. `recipe_available` is computed when the menu is read, not stored.
- **Order.** Responses are sorted by day order, then slot order (breakfast, lunch, snack, dinner).
- *Alternative: `days: { monday: { lunch: … } }`.* Rejected. It is harder to validate and harder for agents to fill in.

### D7. Domain and application pieces
- **Domain.**
  - `WeekStart` value object: strict `YYYY-MM-DD`, a round-trip check that rejects dates like `2026-02-30`, and `getUTCDay() === 1` so the server timezone cannot shift the day.
  - `MealDay` and `MealSlot` enums.
  - `MealEntry` value object: the note is trimmed and limited to 200 characters, and an empty note becomes undefined.
  - `WeeklyMenu` entity: `create()` enforces a unique `(day, slot)`.
  - Errors: `MenuDomainError`, extended by `InvalidMenuPayloadError`, `UnknownMenuRecipeError` and `MenuNotFoundError`.
- **Port.** `WeeklyMenuRepositoryPort` with `findByWeek(userId, weekStart)`, `findAll(userId)`, `save(menu)` and `deleteByWeek(userId, weekStart)`. The method names don't assume any particular storage, so a Postgres adapter can implement the same port.
- **Adapter.** `JsonFileMenuRepository` uses `data/menus.json` next to `recipes.json`, with the same path convention as the existing recipe repository. It accepts an optional `filePath` so tests can isolate their data.
- **Use cases.**
  - `SaveWeeklyMenuService` validates the menu, resolves each `recipe_id` with `RecipeRepositoryPort.findById(userId, id)`, snapshots the titles, keeps `id` and `createdAt` on replace, and returns `{ menu, created }`.
  - `SetMenuSlotService` loads the menu (or starts an empty one), upserts or removes the entry, then delegates to the save service.
  - `GetWeeklyMenuService`, `ListWeeklyMenusService` and `DeleteWeeklyMenuService`, plus a `MenuView` mapper that adds `recipe_available`.
- **HTTP.** `MenuController` maps `InvalidMenuPayloadError` and `UnknownMenuRecipeError` to 400, `MenuNotFoundError` to 404, and anything else to 500. `PUT` returns 201 when `created`, otherwise 200.

### D8. Frontend Weekly Menu view
- **Wiring.** `App.tsx` gets a `'menu'` view and a header button ("📅 Weekly Menu"). `api.service.ts` gets `fetchMenus`, `fetchMenu(weekStart)` (a 404 becomes `null`), `saveMenu(weekStart, meals)` and `deleteMenu(weekStart)`.
- **Component.** `components/WeeklyMenu.tsx` holds `weekStart`, starting at the Monday of the current local week, with prev/next buttons that move ±7 days. It renders a 7×4 grid:
  - Each cell shows the assigned recipe's title as a button that opens the recipe detail.
  - Each cell has a `<select>` with the user's recipes; "— empty —" clears the slot.
  - A "Delete menu" action goes through `ConfirmModal`.
- **Saving.** Each cell change sends the full meals list through `PUT`. The UI and the agent therefore share one save path, and the UI updates after the server responds.
- **Date helpers.** Pure helpers live in `src/frontend/utils/week.ts`.
- `/mcp` does not go through the Vite proxy. Agents connect to the backend port directly.

### D9. Tests
- **Vitest unit tests:** `WeekStart`, `WeeklyMenu.create`, the save and set-slot services (with in-memory fakes for both ports), `resolveUserId`, and the `week.ts` helpers.
- **Supertest:**
  - `/api/menus` CRUD and status codes, with `afterEach` teardown of the menus and recipes created.
  - `/mcp` through JSON-RPC `POST` requests (`Accept: application/json, text/event-stream`): `initialize` and `tools/list` succeed; 405 on `GET`; 403 with a foreign `Origin`; 404 when `NODE_ENV=production`. The production case uses a factory or an env toggle, so the shared app is not mutated.
- **MCP tool tests:** an `@modelcontextprotocol/client` `Client` connected to the factory's server. Use the SDK's in-memory transport if v2 exposes one; otherwise use Streamable HTTP against an ephemeral `app.listen(0)`. The services use temporary-file repositories. The tests cover every tool's success and error paths, the annotations, the exact tool list and the prompt.
- **Playwright:** create a recipe, open Weekly Menu, assign the recipe to a slot, reload and check it persisted, clear the slot, delete the menu, then tear down.

## Risks / Trade-offs

- [Someone deploys before the auth change and expects `/mcp` to work] → The production guard returns 404, and the proposal records "Postgres, then auth, then deploy" as the order.
- [Someone deploys before the Postgres change] → JSON writes would be lost on a serverless host. The proposal makes the Postgres change a prerequisite for deployment. This change only stores files locally.
- [Agents may invent recipe IDs or save without asking] → The server validates IDs against the user's recipes. The tool descriptions and the prompt require confirmation before saving, and `save_weekly_menu` carries a destructive hint.
- [Some desktop clients only support stdio, not HTTP] → Claude Code, Cursor, VS Code and the MCP Inspector support HTTP. For stdio-only clients the guide can point to a generic stdio-to-HTTP bridge as optional, untested guidance.
- [MCP SDK v2 is young, so its APIs or exports may shift between minor versions] → Pin minor versions in `package.json`. The adapter is isolated in `infrastructure/mcp/`.
- [`x-user-id` can be spoofed by any client] → This is accepted for development only. It is the same trust model as today's REST API, and the auth change replaces it.
- [Recipes have no meal-type or diet tags, so the agent infers suitability from titles and descriptions] → Accepted for now. Tags are a candidate follow-up.

## Migration Plan

- No data migration. `menus.json` is created the first time a menu is saved. `recipes.json` keeps its format and location.
- **Rollout:** merge, run `npm install`, run `npm run dev`, then connect an agent to `http://localhost:3000/mcp` following `docs/mcp-server.md`.
- **Rollback:** the menu routes, the `/mcp` mount and the UI view are additive and can each be reverted on their own. The `resolveUserId` refactor keeps the recipe behaviour identical.

## Open Questions

- Should the Vercel follow-up keep Express as a single serverless function, or split it into separate routes? This is decided in that change and does not affect this design.
- Should recipes get optional tags (meal type, diet) to improve planning? That would be a separate change to `recipe-creation`.
