## 1. Frontend API Error Handling

- [x] 1.1 Implement safe response parser helper in `src/frontend/services/api.service.ts` to handle non-200 and non-JSON responses without SyntaxError.

## 2. Express Backend & Routing Audit

- [x] 2.1 Verify Express route registration and error JSON payloads for `PUT /api/recipes/:id` in `src/backend/infrastructure/http/server.ts` and `recipe.controller.ts`.

## 3. Integration & E2E Testing Verification

- [x] 3.1 Write Express HTTP REST API integration test suite (`src/backend/tests/server.spec.ts`) using Supertest to test `POST`, `GET`, and `PUT /api/recipes/:id`.
- [x] 3.2 Add Playwright E2E browser test suite (`e2e/recipe-editing.spec.ts`) testing the full end-to-end user edit flow.
- [x] 3.3 Run all unit, integration, and E2E tests, and verify Vite production build.
