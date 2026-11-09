# Spec Delta

## Purpose

Connects any MCP-compatible AI agent to the user's Mela Recipes cookbook and weekly menus through an HTTP endpoint served by the backend, so the agent can search the user's recipes and build, read and adjust weekly menus on their behalf.

## ADDED Requirements

### Requirement: MCP Endpoint Over Streamable HTTP
The backend SHALL serve the Model Context Protocol at the `/mcp` path using the Streamable HTTP transport. It SHALL identify itself with the name `mela-recipes` and the application version.

#### Scenario: Agent connects and discovers capabilities
- **WHEN** an MCP client sends `initialize` to `http://localhost:3000/mcp`, followed by `tools/list` and `prompts/list`
- **THEN** the server MUST complete the handshake with name `mela-recipes`, and MUST list the tools `list_recipes`, `get_recipe`, `list_weekly_menus`, `get_weekly_menu`, `save_weekly_menu` and `set_menu_slot`, and the prompt `plan_weekly_menu`

### Requirement: Stateless Request Handling
The MCP endpoint SHALL answer every request without depending on server-side session state from earlier requests. Any server instance can then handle any request, which a serverless host requires.

#### Scenario: Tool call handled independently
- **WHEN** a client sends a `tools/call` request that is routed to a freshly started server instance
- **THEN** the server MUST process the call and return its result without requiring a session established on another instance

### Requirement: Shares Data With the Web App
The MCP endpoint SHALL read and write the same recipe and menu storage as the REST API. Changes made through either one SHALL be visible to the other on its next read.

#### Scenario: Menu saved by an agent appears in the web app
- **WHEN** an agent saves a menu through `/mcp` while the web app is open, and the user then reloads the Weekly Menu view
- **THEN** the web app MUST display the menu the agent saved

### Requirement: User Identity Resolved Per Request
The MCP endpoint SHALL determine the acting user for each request with the same identity mechanism as the REST API: currently the `x-user-id` request header, defaulting to `default-local-user`. No tool SHALL accept a user identifier as input.

#### Scenario: Default user
- **WHEN** an agent calls `list_recipes` without an `x-user-id` header
- **THEN** the server MUST return only recipes owned by `default-local-user`, which are the same recipes the web app shows

#### Scenario: User from header
- **WHEN** an agent's requests carry `x-user-id: ana` and it calls any tool
- **THEN** the server MUST read and write only data owned by user `ana`

### Requirement: Unauthenticated Access Restricted to Development
Until authentication is added, the MCP endpoint SHALL be unavailable in production mode (`NODE_ENV=production`). In other modes, it SHALL reject requests whose `Origin` header names a host other than `localhost` or `127.0.0.1`.

#### Scenario: Production mode
- **WHEN** the backend runs with `NODE_ENV=production` and a client sends a request to `/mcp`
- **THEN** the server MUST NOT run the request through MCP, and MUST answer HTTP 404 with a JSON error payload stating that the MCP endpoint is not enabled

#### Scenario: Foreign origin in development
- **WHEN** a request to `/mcp` carries `Origin: https://evil.example`
- **THEN** the server MUST reject it with HTTP 403 and MUST NOT execute any tool

#### Scenario: Local client without an origin
- **WHEN** a local MCP client such as an IDE or CLI sends a request without an `Origin` header
- **THEN** the server MUST process the request normally

### Requirement: Search Recipes Tool
The server SHALL provide a read-only `list_recipes` tool that returns summaries of the user's recipes: id, title, description, servings, prep time and ingredient names. It SHALL take optional filters, which combine with AND: `query` (case-insensitive match on title or description), `ingredient` (case-insensitive match on an ingredient name), `max_prep_time_minutes` and `limit`.

#### Scenario: Listing all recipes
- **WHEN** an agent calls `list_recipes` with no arguments
- **THEN** the server MUST return a summary for every recipe owned by the user

#### Scenario: Filtering by prep time and ingredient
- **WHEN** an agent calls `list_recipes` with `max_prep_time_minutes: 30` and `ingredient: "egg"`
- **THEN** the server MUST return only recipes with a prep time of 30 minutes or less that contain an ingredient whose name includes "egg"

#### Scenario: No matches
- **WHEN** no recipe matches the filters
- **THEN** the server MUST return an empty list (not an error), with a message saying no recipes matched

### Requirement: Recipe Detail Tool
The server SHALL provide a read-only `get_recipe` tool that takes a `recipe_id` and returns that recipe in full: ingredients with amounts and units, equipment and ordered steps.

#### Scenario: Existing recipe
- **WHEN** an agent calls `get_recipe` with the ID of one of the user's recipes
- **THEN** the server MUST return the full recipe

#### Scenario: Unknown recipe
- **WHEN** an agent calls `get_recipe` with an ID that does not exist for the user
- **THEN** the server MUST return a tool error result stating that the recipe was not found

### Requirement: Read Weekly Menus Tools
The server SHALL provide a read-only `list_weekly_menus` tool, which returns the user's stored menus ordered by week, most recent first. It SHALL also provide a read-only `get_weekly_menu` tool, which takes a `week_start` and returns that week's menu with each entry's recipe title and availability.

#### Scenario: Reading a stored week
- **WHEN** an agent calls `get_weekly_menu` with `week_start` `2026-11-09` and a menu exists
- **THEN** the server MUST return the menu's entries, including `day`, `slot`, `recipe_id`, `recipe_title`, `recipe_available` and `note`

#### Scenario: Reading a week without a menu
- **WHEN** an agent calls `get_weekly_menu` for a week with no stored menu
- **THEN** the server MUST return a successful result that explicitly says no menu exists for that week

### Requirement: Save Weekly Menu Tool
The server SHALL provide a `save_weekly_menu` tool that takes a `week_start` and a full list of meal entries, and creates or replaces that week's menu. It SHALL apply the same validation rules as the REST API.

#### Scenario: Agent saves a full week
- **WHEN** an agent calls `save_weekly_menu` with a Monday `week_start` and valid entries that reference the user's recipes
- **THEN** the server MUST store the menu and return the saved menu, including recipe titles

#### Scenario: Agent references an invented recipe
- **WHEN** an agent calls `save_weekly_menu` with a `recipe_id` that is not one of the user's recipes
- **THEN** the server MUST return a tool error result naming the unknown recipe ID, and MUST NOT change the stored menu

### Requirement: Set Single Menu Slot Tool
The server SHALL provide a `set_menu_slot` tool that takes `week_start`, `day`, `slot` and either a `recipe_id` with an optional `note`, or `recipe_id: null` to clear the slot. It SHALL change only that slot, and SHALL create the week's menu if none exists.

#### Scenario: Swapping one meal
- **WHEN** an agent calls `set_menu_slot` for Friday dinner with a different valid `recipe_id`
- **THEN** the server MUST replace only the Friday dinner entry, keep every other entry unchanged and return the updated menu

#### Scenario: Clearing a slot
- **WHEN** an agent calls `set_menu_slot` with `recipe_id: null`
- **THEN** the server MUST remove that entry if present and return the updated menu

### Requirement: Tool Input Validation and Error Results
The server SHALL publish an input schema for every tool. When the input is invalid or a domain rule is broken, it SHALL return a tool error result with a readable message, and the endpoint SHALL keep serving later requests.

#### Scenario: Invalid week start passed to a tool
- **WHEN** an agent calls `get_weekly_menu` or `save_weekly_menu` with `week_start` `2026-11-11` (not a Monday)
- **THEN** the server MUST return a tool error result explaining that the week start must be a Monday in `YYYY-MM-DD` format, and MUST continue to answer later requests

### Requirement: Machine-Readable Tool Results
Every successful tool result SHALL include its data as JSON, both as structured content and as a text block, so that agents that support either form can use it.

#### Scenario: Structured result
- **WHEN** an agent calls `list_recipes`
- **THEN** the result MUST contain the recipe summaries as structured content and as a JSON text content block with the same data

### Requirement: Tool Behaviour Hints
The server SHALL mark `list_recipes`, `get_recipe`, `list_weekly_menus` and `get_weekly_menu` as read-only. It SHALL mark `save_weekly_menu` as replacing existing data, so that agents can ask the user for confirmation.

#### Scenario: Inspecting tool annotations
- **WHEN** an MCP client lists the server's tools
- **THEN** the four read tools MUST carry a read-only hint, and `save_weekly_menu` MUST carry a destructive hint

### Requirement: Recipes Are Read-Only Through MCP
The MCP endpoint SHALL NOT expose any tool that creates, edits or deletes recipes.

#### Scenario: No recipe write tools
- **WHEN** an MCP client lists the server's tools
- **THEN** no listed tool MUST be able to create, update or delete a recipe

### Requirement: Weekly Menu Planning Prompt
The server SHALL provide a `plan_weekly_menu` prompt with optional `week_start` and `preferences` arguments. It SHALL tell the agent to use only the user's recipes from `list_recipes`, to respect the stated preferences and avoid repeating recipes where possible, to show the proposed menu to the user, and to save it with `save_weekly_menu` only after the user agrees.

#### Scenario: Agent uses the planning prompt
- **WHEN** a client requests the `plan_weekly_menu` prompt with `preferences: "quick dinners, lunch and dinner only"`
- **THEN** the server MUST return a prompt message that includes those preferences, the target week (the next Monday by default) and the tool-usage guidance above

### Requirement: Connection Documentation
The project SHALL document how to start the backend and connect local MCP clients to `http://localhost:3000/mcp`, covering at least Claude Code, Cursor, VS Code and the MCP Inspector. It SHALL explain how to set the `x-user-id` header and state that the endpoint is for development only until authentication exists.

#### Scenario: New user connects an agent
- **WHEN** a user starts the backend and follows the connection guide for their MCP client
- **THEN** the client MUST be able to connect to `/mcp` and list its tools without further code changes

### Requirement: MCP Endpoint Test Coverage
The project test suite SHALL exercise every tool and the prompt through an MCP client, and SHALL exercise the `/mcp` HTTP endpoint, including the production and origin guards. These tests SHALL cover successful results and error results, and teardown SHALL clean up any data they create.

#### Scenario: Running MCP tests in CI
- **WHEN** `npm run test` runs in CI
- **THEN** the MCP tool and endpoint tests MUST run and pass without an external agent
