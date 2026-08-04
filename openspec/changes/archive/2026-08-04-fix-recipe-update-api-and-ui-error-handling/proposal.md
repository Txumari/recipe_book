## Why

When editing a recipe, if an API call fails or hits a proxy mismatch, `api.service.ts` attempts `await response.json()` before checking `response.ok`, producing `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`. Unit tests missed this because they ran in-memory without exercising the Vite dev proxy, Express HTTP routes, or real browser network calls. Adding E2E and HTTP integration tests provides a full-stack safety net.

## What Changes

- **Frontend Robust Error Parsing**: Update `api.service.ts` to inspect `response.ok` first, check `Content-Type` headers, and safely parse text/HTML error responses without throwing JSON parse syntax errors.
- **Backend & Route Handling Verification**: Ensure Express server routes properly handle `PUT /api/recipes/:id` and return clean JSON errors (400, 404, 409, 500) without triggering HTML fallbacks.
- **End-to-End (E2E) & Integration Testing**: Set up Playwright / Vitest E2E tests and Supertest HTTP integration tests to verify the complete user flow from browser UI -> Vite proxy -> Express backend -> disk storage.

## Capabilities

### New Capabilities

### Modified Capabilities
- `recipe-creation`: Mandate End-to-End (E2E) and HTTP integration test coverage for recipe lifecycle operations (Create, Read, Edit) and ensure safe non-JSON error handling in the API client.

## Impact

- `src/frontend/services/api.service.ts`: Safe error response parsing for non-OK / non-JSON responses.
- `e2e/` & `src/backend/tests/`: Add Playwright E2E tests and Supertest HTTP integration tests.
