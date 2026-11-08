import { Router, Request, Response, NextFunction } from 'express';
import { localhostHostValidation, localhostOriginValidation } from '@modelcontextprotocol/express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { createRecipesMcpServer, RecipesMcpServices } from './recipes-mcp.server.ts';
import { resolveUserId } from '../http/resolve-user-id.ts';

/**
 * Until authentication exists the endpoint is unauthenticated, so it must never be
 * served in production. Checked per request so the environment is read at call time.
 * The authentication change replaces this guard with bearer-token verification.
 */
export function mcpProductionGuard(_req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({
      error: 'MCP endpoint is not enabled. It is available in development only until authentication is added.',
    });
    return;
  }
  next();
}

function methodNotAllowed(_req: Request, res: Response): void {
  res
    .status(405)
    .set('Allow', 'POST')
    .json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed. This MCP endpoint is stateless and only accepts POST.' },
      id: null,
    });
}

/**
 * Express router serving MCP over stateless Streamable HTTP: one fresh server and transport
 * per POST, so any instance (e.g. a serverless function) can answer any request.
 */
export function createMcpRouter(services: RecipesMcpServices): Router {
  const router = Router();

  router.use(mcpProductionGuard);
  router.use(localhostOriginValidation());
  router.use(localhostHostValidation());

  router.post('/', async (req: Request, res: Response) => {
    const server = createRecipesMcpServer({ userId: resolveUserId(req), services });
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('[mcp] Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
      }
    }
  });

  router.get('/', methodNotAllowed);
  router.delete('/', methodNotAllowed);

  return router;
}
