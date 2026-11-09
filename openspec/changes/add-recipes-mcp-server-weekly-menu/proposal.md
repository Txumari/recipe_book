# Proposal

## Why

Users keep their cookbook in Mela Recipes, but planning what to cook each week still happens by hand. AI agents (Claude Code, Cursor, VS Code, claude.ai and others) can plan a varied week well if they can see the user's own recipes. The Model Context Protocol (MCP) is the standard way to connect any agent to an app's data. An MCP endpoint lets the user say "plan my week" in their agent and get a menu built only from their recipes, saved in the app and visible in the web UI.

The app is still in development and will later be deployed to a server (planned: Vercel), using Postgres for storage and real user authentication. Those decisions are still pending. This change therefore builds the feature in a way that works now in local development and carries over unchanged once storage, auth and hosting are added.

## What Changes

- **New weekly menu domain**: a `WeeklyMenu` belongs to a user and covers one ISO week, from Monday to Sunday. Each day has flexible meal slots (`breakfast`, `lunch`, `snack`, `dinner`). Each slot holds at most one of the user's recipes, and any slot can stay empty. There is at most one menu per user per week.
- **Menu storage behind a port**: the domain uses a menu repository interface. For local development the only adapter is a JSON file (`data/menus.json`), the same approach as recipes today. A Postgres adapter will replace it in a later change without touching the domain, the API or the UI.
- **Menu REST API**: `GET /api/menus`, `GET /api/menus/:weekStart`, `PUT /api/menus/:weekStart` (create or replace) and `DELETE /api/menus/:weekStart`.
- **MCP endpoint in the backend**: the Express backend serves MCP at `/mcp` over **stateless Streamable HTTP**. This is the same shape a serverless host like Vercel needs. The endpoint exposes:
  - read-only recipe tools: `list_recipes` (search and filter) and `get_recipe`
  - menu tools: `list_weekly_menus`, `get_weekly_menu`, `save_weekly_menu` and `set_menu_slot`
  - a `plan_weekly_menu` prompt that guides any agent through building a menu
- **The agent decides the menu**: the server holds no planning algorithm. It provides data and validation, and the agent picks the recipes from the conversation (preferences, variety, cooking time).
- **Single user-identity resolution point**: the REST API and `/mcp` decide "who is the user" in one shared place. Today that is the `x-user-id` header, defaulting to `default-local-user`. Adding authentication later only replaces this one piece. MCP tools never accept a user ID as input.
- **Development-only safety guard**: until authentication exists, `/mcp` is unauthenticated. It is therefore disabled in production mode and only accepts requests from local origins.
- **Weekly Menu web UI**: a new "Weekly Menu" view in the React app. It shows a 7-day grid of slots with week navigation. From it, the user can open a recipe, assign or clear a slot, and delete the menu after a confirmation.
- **Connection guide**: `docs/mcp-server.md` explains how to connect local MCP clients to `http://localhost:3000/mcp`.

### Non-goals

- Postgres storage, user authentication (OAuth) and deploying to Vercel. Each one is a follow-up change, listed below.
- A local stdio MCP process. HTTP was chosen so the endpoint is the same in development and once deployed.
- Creating, editing or deleting recipes through MCP. Recipe tools are read-only in this change.
- Server-side automatic menu generation, shopping lists, nutrition data, and recipe tags or categories such as meal type and diet.

### Follow-up changes (planned order)

1. **Postgres persistence**: implement Postgres adapters for the recipe and menu repository ports. Candidates are Supabase or Neon, provisioned through the Vercel Marketplace on their free plans. This change is **required before deployment**, because a serverless host has no persistent disk, so the JSON files would lose data.
2. **User authentication**: real users for the web app and OAuth 2.1 for `/mcp`, as the MCP authorization spec requires, using the same identity provider for both. Free candidates are Supabase Auth (if Supabase is chosen in step 1), Auth0 and WorkOS AuthKit. This change replaces the identity resolution point and lifts the production guard on `/mcp`.
3. **Vercel deployment**: Hobby plan for the frontend and the Express API, including `/mcp`. Note that Hobby is limited to personal, non-commercial use.

## Capabilities

### New Capabilities
- `weekly-menu`: the weekly menu domain model and its rules (week, days, flexible slots, recipe references), storage, REST API, and the Weekly Menu web UI.
- `recipes-mcp-server`: the MCP endpoint that exposes the user's recipes and weekly menus to AI agents through tools and a prompt, including transport, user identity, the development-only guard and error reporting.

### Modified Capabilities
None. Recipe behaviour and the REST API do not change. Recipe storage stays the existing JSON file.

## Impact

- **Backend**:
  - new domain entity, value objects and errors for menus
  - a new menu repository port and a JSON file adapter
  - new use cases and a new `MenuController`
  - a shared user-identity resolver used by `RecipeController`, `MenuController` and `/mcp`; recipe behaviour does not change
  - a new `src/backend/infrastructure/mcp/` adapter mounted at `/mcp` in `server.ts`
- **Frontend**: new `WeeklyMenu` component(s), new menu functions in `api.service.ts`, and a new navigation entry and view in `App.tsx`.
- **Dependencies**: adds the MCP TypeScript SDK v2 (`@modelcontextprotocol/server`, its Express adapter, and `@modelcontextprotocol/client` for tests) and `zod` v4.
- **Docs**: `docs/mcp-server.md`.
- **Tests**:
  - unit tests for the menu domain and use cases
  - Supertest tests for `/api/menus` and for the `/mcp` endpoint, including the production and origin guards
  - MCP tool tests through an SDK client
  - a Playwright E2E test for the Weekly Menu view
  - all of these run in the existing CI
- **Data**: a new `data/menus.json` file for local development only. The format of `data/recipes.json` does not change.
