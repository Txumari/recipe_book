import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { app } from '../infrastructure/http/server.ts';

const ACCEPT = 'application/json, text/event-stream';
const USER = 'mcp-http-test-user';

const initializeBody = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'supertest', version: '1.0.0' },
  },
};

/** Responses may be JSON or a single SSE event; extract the JSON-RPC message either way. */
function parseRpc(res: request.Response): any {
  if (res.headers['content-type']?.includes('text/event-stream')) {
    const data = res.text
      .split('\n')
      .filter(l => l.startsWith('data:'))
      .map(l => l.slice(5).trim())
      .join('');
    return JSON.parse(data);
  }
  return res.body;
}

describe('MCP HTTP endpoint (/mcp)', () => {
  let httpServer: Server;
  let baseUrl: string;
  const createdRecipes: string[] = [];

  beforeAll(async () => {
    httpServer = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => httpServer.once('listening', () => resolve()));
    baseUrl = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  afterEach(async () => {
    while (createdRecipes.length > 0) {
      await request(app).delete(`/api/recipes/${createdRecipes.pop()}`).set('x-user-id', USER);
    }
  });

  it('answers initialize over stateless POST with the server name', async () => {
    const res = await request(app).post('/mcp').set('Accept', ACCEPT).send(initializeBody);
    expect(res.status).toBe(200);
    const rpc = parseRpc(res);
    expect(rpc.result.serverInfo.name).toBe('mela-recipes');
    expect(res.headers['mcp-session-id']).toBeUndefined();
  });

  it('serves tools/list from a fresh instance without any session', async () => {
    const res = await request(app)
      .post('/mcp')
      .set('Accept', ACCEPT)
      .set('MCP-Protocol-Version', '2025-11-25')
      .send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    expect(res.status).toBe(200);
    const names = parseRpc(res).result.tools.map((t: { name: string }) => t.name).sort();
    expect(names).toEqual([
      'get_recipe',
      'get_weekly_menu',
      'list_recipes',
      'list_weekly_menus',
      'save_weekly_menu',
      'set_menu_slot',
    ]);
  });

  it('works end to end with the official MCP client, scoped to the x-user-id header', async () => {
    const created = await request(app)
      .post('/api/recipes')
      .set('x-user-id', USER)
      .send({
        title: `MCP HTTP Recipe ${Date.now()}`,
        servings: 2,
        prep_time_minutes: 10,
        ingredients: [{ name: 'Egg', amount: 1, unit: 'unit' }],
        steps: [{ step_number: 1, instruction: 'Cook' }],
      });
    createdRecipes.push(created.body.id);

    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
      requestInit: { headers: { 'x-user-id': USER } },
    });
    const client = new Client({ name: 'http-test-client', version: '1.0.0' });
    await client.connect(transport);
    try {
      expect(client.getServerVersion()?.name).toBe('mela-recipes');
      const result = (await client.callTool({ name: 'list_recipes', arguments: {} })) as any;
      expect(result.structuredContent.recipes.map((r: { id: string }) => r.id)).toEqual([created.body.id]);
    } finally {
      await client.close();
    }
  });

  it('defaults to the default local user when no x-user-id header is sent', async () => {
    const title = `MCP default user recipe ${Date.now()}`;
    const created = await request(app)
      .post('/api/recipes')
      .set('x-user-id', 'default-local-user')
      .send({
        title,
        servings: 2,
        prep_time_minutes: 10,
        ingredients: [{ name: 'Huevo', amount: 2, unit: 'unit' }],
        steps: [{ step_number: 1, instruction: 'Batir' }],
      });
    expect(created.status).toBe(201);

    try {
      const res = await request(app)
        .post('/mcp')
        .set('Accept', ACCEPT)
        .set('MCP-Protocol-Version', '2025-11-25')
        .send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_recipes', arguments: { query: title } } });
      expect(res.status).toBe(200);
      const recipes = parseRpc(res).result.structuredContent.recipes;
      expect(recipes.map((r: { id: string }) => r.id)).toEqual([created.body.id]);
    } finally {
      await request(app).delete(`/api/recipes/${created.body.id}`).set('x-user-id', 'default-local-user');
    }
  });

  it.each(['get', 'delete'] as const)('rejects %s with 405 (stateless, POST only)', async method => {
    const res = await request(app)[method]('/mcp').set('Accept', ACCEPT);
    expect(res.status).toBe(405);
  });

  it('rejects a foreign Origin with 403 and runs no tool', async () => {
    const res = await request(app)
      .post('/mcp')
      .set('Accept', ACCEPT)
      .set('Origin', 'https://evil.example')
      .send(initializeBody);
    expect(res.status).toBe(403);
  });

  it('accepts a localhost Origin', async () => {
    const res = await request(app)
      .post('/mcp')
      .set('Accept', ACCEPT)
      .set('Origin', 'http://localhost:5173')
      .send(initializeBody);
    expect(res.status).toBe(200);
  });

  it('rejects a foreign Host header with 403', async () => {
    const res = await request(app)
      .post('/mcp')
      .set('Accept', ACCEPT)
      .set('Host', 'evil.example')
      .send(initializeBody);
    expect(res.status).toBe(403);
  });

  it('returns 404 JSON and does not run MCP in production mode', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await request(app).post('/mcp').set('Accept', ACCEPT).send(initializeBody);
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/MCP endpoint is not enabled/);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('does not apply the MCP guards to /api routes', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example').set('Host', 'evil.example');
    expect(res.status).toBe(200);
  });
});
