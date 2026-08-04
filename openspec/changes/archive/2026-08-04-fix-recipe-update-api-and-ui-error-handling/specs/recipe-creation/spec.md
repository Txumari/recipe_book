## ADDED Requirements

### Requirement: Robust HTTP Client Error Handling
The frontend API client (`api.service.ts`) SHALL inspect HTTP response status codes (`response.ok`) and response content types before parsing JSON, preventing `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON` when non-JSON/HTML 404/500 responses occur.

#### Scenario: Handling non-JSON 404 error response
- **WHEN** an HTTP request to `/api/recipes/:id` returns a non-200 status with an HTML body
- **THEN** the client MUST catch the error safely and throw an Error with a readable message without throwing a JSON parse SyntaxError.

### Requirement: End-to-End (E2E) & HTTP Integration Testing
The project test suite SHALL include End-to-End (E2E) tests and HTTP integration tests verifying the full flow of creating, viewing, and editing recipes from browser UI to backend persistence.

#### Scenario: E2E testing of recipe edit flow
- **WHEN** an E2E browser test creates a recipe, opens detail view, clicks "Edit Recipe", modifies attributes, and clicks "Save Changes"
- **THEN** the application MUST successfully persist updates to backend storage and update the UI view without network proxy or JSON parsing errors.

#### Scenario: Integration testing PUT /api/recipes/:id
- **WHEN** HTTP integration tests execute a `PUT` request to `/api/recipes/:id`
- **THEN** the Express route handler MUST execute `UpdateRecipeService` and return appropriate HTTP status codes (200, 400, 404, 409).
