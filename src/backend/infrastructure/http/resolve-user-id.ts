import type { IncomingHttpHeaders } from 'http';

export const DEFAULT_USER_ID = 'default-local-user';

/**
 * Single place that decides "who is the user" for every inbound request
 * (REST API and MCP endpoint).
 *
 * Today the identity comes from the unauthenticated `x-user-id` header and
 * falls back to the local default user. When authentication is added, this
 * function is the only piece that changes (e.g. to read the verified token's
 * subject), so callers must never read the header directly.
 */
export function resolveUserId(req: { headers: IncomingHttpHeaders }): string {
  const raw = req.headers['x-user-id'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed ? trimmed : DEFAULT_USER_ID;
}
