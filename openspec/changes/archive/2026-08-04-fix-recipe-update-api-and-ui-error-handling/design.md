## Context

See proposal.md for motivation and `specs/recipe-creation/spec.md` for requirements.

### Root Cause Analysis & Why Unit Tests Missed It

1. **Why UI threw `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`**:
   In `src/frontend/services/api.service.ts`, functions ran `const data = await response.json();` BEFORE checking `if (!response.ok)`. When Express or Vite's dev proxy returns a non-JSON HTTP response (such as an HTML 404 fallback page starting with `<!DOCTYPE html>`), JavaScript attempts to parse HTML as JSON, producing an unhandled `SyntaxError` that masks the true error.

2. **Why Unit Tests Did Not Detect It**:
   Unit tests in `recipe.service.spec.ts` tested the domain and service layers in-memory (`InMemoryTestRepository`). They did not run E2E browser tests or HTTP integration tests (`supertest`) to verify real browser `fetch()` behavior, Vite proxy routing, and status code error handling.

## Goals / Non-Goals

**Goals:**
- Implement safe HTTP response parsing in `src/frontend/services/api.service.ts` that checks `response.ok` and `Content-Type` before parsing JSON.
- Ensure Express routes return clean `application/json` errors for 400, 404, 409, and 500 status codes.
- Add `supertest` HTTP integration tests in `src/backend/tests/server.spec.ts` testing actual Express routes over HTTP.
- Add Playwright E2E test in `e2e/recipe-editing.spec.ts` launching Vite dev server + Express backend to test end-to-end browser user interactions.

**Non-Goals:**
- Replacing Express or Vite dev proxy infrastructure.

## Decisions

### 1. `handleApiResponse` Helper in `api.service.ts`
- **Decision:** Wrap fetch responses in a helper inspecting `response.ok` and `Content-Type` before calling `response.json()`.
- **Rationale:** Guarantees that HTML error responses or proxy fallbacks are caught gracefully and converted into user-friendly error messages without crashing with `SyntaxError`.

### 2. Playwright E2E + Supertest Integration Test Suite
- **Decision:** 
  1. Add Supertest integration tests for backend HTTP REST API endpoints.
  2. Add Playwright E2E tests (`@playwright/test`) executing full browser interaction workflows (create recipe -> click edit -> modify inputs -> save changes -> verify detail update).
- **Rationale:** Catches network proxy fallbacks, browser `fetch` serialization, DOM state sync, and real user interaction bugs.
