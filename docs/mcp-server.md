# Mela Recipes MCP server

Mela Recipes exposes your recipes and weekly menus to AI agents through the
[Model Context Protocol (MCP)](https://modelcontextprotocol.io). Once an agent is
connected, you can ask it things like *"plan my meals for next week, quick dinners
please"*. The agent picks recipes from **your own cookbook**, shows you the plan, and
saves it after you approve. The menu then appears in the web app under
**📅 Weekly Menu**.

> ⚠️ **Development only.** The endpoint has no authentication yet. It only answers
> local requests (`localhost` / `127.0.0.1`) and is switched off when
> `NODE_ENV=production`. Do not expose it publicly. See [Roadmap](#roadmap).

## 1. Start the backend

The MCP endpoint is part of the Express backend, so the backend must be running:

```bash
npm install
npm run dev:backend      # or `npm run dev` for backend + web app
```

The endpoint is available at **`http://localhost:3000/mcp`** (Streamable HTTP,
stateless: one `POST` per request, with no sessions).

## 2. Connect your agent

All clients use the same URL. Replace the port if you changed `PORT`.

### Claude Code

```bash
claude mcp add --transport http mela-recipes http://localhost:3000/mcp
```

Then run `/mcp` inside Claude Code. `mela-recipes` should be listed as connected,
with six tools. To act as a specific user, add a header:

```bash
claude mcp add --transport http mela-recipes http://localhost:3000/mcp --header "x-user-id: ana"
```

### Cursor

Add the server to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (this project only):

```json
{
  "mcpServers": {
    "mela-recipes": {
      "url": "http://localhost:3000/mcp",
      "headers": { "x-user-id": "default-local-user" }
    }
  }
}
```

### VS Code (GitHub Copilot agent mode)

Add the server to `.vscode/mcp.json`:

```json
{
  "servers": {
    "mela-recipes": {
      "type": "http",
      "url": "http://localhost:3000/mcp",
      "headers": { "x-user-id": "default-local-user" }
    }
  }
}
```

### MCP Inspector (testing without an agent)

```bash
npx @modelcontextprotocol/inspector
```

In the Inspector UI, choose transport **Streamable HTTP**, enter the URL
`http://localhost:3000/mcp`, then click **Connect**, open **Tools** and **List Tools**.

To check from the command line instead:

```bash
npx @modelcontextprotocol/inspector --cli http://localhost:3000/mcp --transport http --method tools/list
```

### Other clients (Claude Desktop, stdio-only clients)

The local Claude Desktop config only launches **stdio** servers. You can use a generic
stdio-to-HTTP bridge such as `mcp-remote`, but this setup is not tested by this project:

```json
{
  "mcpServers": {
    "mela-recipes": { "command": "npx", "args": ["-y", "mcp-remote", "http://localhost:3000/mcp"] }
  }
}
```

## 3. Which user's data?

The server acts for one user per request, chosen exactly like the REST API does:

| How | Result |
|---|---|
| no header | `default-local-user`, the same user the web app uses |
| `x-user-id: <id>` header | that user's recipes and menus |

Tools never take a user ID as an argument. Once authentication is added, the user
will come from the login token instead of this header.

## 4. What the agent can do

| Tool | What it does | Changes data? |
|---|---|---|
| `list_recipes` | Search your recipes. Optional filters: `query`, `ingredient`, `max_prep_time_minutes`, `limit` | No |
| `get_recipe` | Full recipe: ingredients, equipment, steps | No |
| `list_weekly_menus` | Your saved menus, most recent first | No |
| `get_weekly_menu` | One week's menu (`week_start` must be a Monday, `YYYY-MM-DD`) | No |
| `save_weekly_menu` | Create or **replace** a whole week | Yes (replaces) |
| `set_menu_slot` | Set or clear one day + slot (`breakfast`, `lunch`, `snack`, `dinner`) | Yes |

Agents **cannot** create, edit or delete recipes.

There is also a prompt called **`plan_weekly_menu`**, with optional `week_start` and
`preferences` arguments. In clients that support prompts (for example as a slash
command in Claude Code), it walks the agent through the planning steps: it uses only
your recipes, avoids repeats, shows the plan first, and saves only after you agree.

### Example conversation

> **You:** Plan lunch and dinner for next week. Quick dinners, under 30 minutes, and no fish on Monday.
>
> **Agent:** *(calls `list_recipes`, then `list_recipes` with `max_prep_time_minutes: 30`)*
> Here's a proposal for the week of 16 Nov:
>
> | | Lunch | Dinner |
> |---|---|---|
> | Mon | Lentejas | Ensalada rápida |
> | Tue | Tortilla de patatas | Crema de calabacín |
> | … | … | … |
>
> Shall I save it?
>
> **You:** Yes, but swap Tuesday's dinner for the omelette.
>
> **Agent:** *(calls `save_weekly_menu` with `week_start: "2026-11-16"`)* Saved. You can see it under **📅 Weekly Menu**.

## 5. Troubleshooting

- **Connection refused**: the backend is not running. Start it with `npm run dev:backend`.
- **`403`**: the request came from a non-local `Origin` or `Host`. Use `localhost` or `127.0.0.1`.
- **`404 MCP endpoint is not enabled`**: the backend is running with `NODE_ENV=production`.
- **`405`**: the endpoint only accepts `POST`, because it is stateless. Make sure the client uses the *Streamable HTTP* transport, not the older SSE transport.
- **"Unknown recipe ID"**: the agent tried to use a recipe that isn't yours. Ask it to call `list_recipes` first.

## Roadmap

These are planned follow-up changes, in this order:

1. **Postgres storage** (Supabase or Neon via the Vercel Marketplace). The local JSON files can't be used on a serverless host.
2. **Authentication**: OAuth 2.1 for `/mcp`, as required by the MCP authorization spec, with the same identity provider as the web app. This removes the development-only guard.
3. **Deployment to Vercel.** Web agents such as claude.ai can then connect over HTTPS.
