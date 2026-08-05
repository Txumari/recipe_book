# recipe-creation Specification

## Purpose
Allows users to register a new recipe into the system, validating that required attributes and nested data structures (ingredients and steps) adhere to domain constraints.
## Requirements
### Requirement: Valid Recipe Registration
The system SHALL validate incoming recipe attributes and save the recipe when all required fields and domain invariants are satisfied.

#### Scenario: Successful recipe creation with valid attributes
- **WHEN** a user submits a recipe payload containing a title, positive servings, positive prep_time_minutes, at least 1 ingredient, and at least 1 step ordered sequentially starting from 1
- **THEN** the system MUST process the creation, save the recipe object, and return the generated recipe domain object with status draft or published.

### Requirement: Ingredient and Step List Minimums
The system SHALL reject any recipe creation request that contains empty ingredients or empty steps arrays.

#### Scenario: Missing ingredients or steps
- **WHEN** a recipe payload is submitted with an empty ingredients array or an empty steps array
- **THEN** the system MUST reject the creation with a validation error indicating that a recipe must contain at least one ingredient and one step.

### Requirement: Servings and Prep Time Bounds
The system SHALL reject any recipe creation request where servings or prep_time_minutes is less than or equal to zero.

#### Scenario: Servings or prep time non-positive
- **WHEN** a recipe payload is submitted with servings <= 0 or prep_time_minutes <= 0
- **THEN** the system MUST reject the creation with a validation error indicating that servings and prep time must be greater than zero.

### Requirement: Sequential Step Numbering
The system SHALL verify that step_number values in steps are sequential positive integers starting at 1 without gaps or duplicates.

#### Scenario: Non-sequential or gapped step numbers
- **WHEN** a recipe payload is submitted with step numbers that do not start at 1, or contain gaps, or contain duplicate step numbers
- **THEN** the system MUST reject the creation with a validation error indicating that step numbers must be sequential starting from 1.

### Requirement: Unique Recipe Title
The system SHALL reject recipe creation if a recipe with the exact same title already exists for the user.

#### Scenario: Duplicate title for current user
- **WHEN** a user submits a recipe creation request with a title matching an existing recipe belonging to that user
- **THEN** the system MUST reject the creation with a validation error indicating that a recipe with this title already exists.

### Requirement: Local Disk Persistence & REST API
The system SHALL expose HTTP REST endpoints on localhost (`POST /api/recipes`, `GET /api/recipes`) and persist created recipes to disk in a local JSON file (`data/recipes.json`).

#### Scenario: Recipe saved to disk on localhost
- **WHEN** a valid recipe creation HTTP request is sent to `POST /api/recipes`
- **THEN** the system MUST persist the new recipe into `./data/recipes.json` and return HTTP status 201 Created with the saved recipe payload.

### Requirement: Expanded Ingredient Units
The system SHALL support an expanded set of measurement units for ingredient quantities, including metric mass (`grams`, `kg`), metric volume (`ml`, `l`), household culinary units (`tbsp`, `tsp`, `cup`, `pinch`), and descriptive count units (`unit`, `clove`, `slice`, `splash`).

#### Scenario: Valid ingredient unit acceptance
- **WHEN** a recipe payload is submitted containing ingredients with expanded units such as `kg`, `tsp`, `cup`, `pinch`, `clove`, `slice`, or `splash`
- **THEN** the system MUST accept the ingredient units, validate amounts > 0, and save the recipe successfully.

#### Scenario: Invalid ingredient unit rejection
- **WHEN** a recipe payload is submitted containing an unrecognised unit string outside the supported taxonomy
- **THEN** the system MUST reject the creation with a validation error specifying invalid ingredient unit.

### Requirement: Kitchen Equipment Prerequisites
The system SHALL allow defining an optional array of equipment items (`equipment`) associated with a recipe, where each item contains a name, an optional specification string (e.g. "20 cm diameter"), and an optional `is_optional` boolean flag.

#### Scenario: Recipe creation with structured equipment list
- **WHEN** a user submits a recipe payload containing equipment items such as `{ name: "Molde redondo", specification: "20 cm", is_optional: false }`
- **THEN** the system MUST validate equipment item names are non-empty, persist the equipment list, and return it in recipe detail queries.

#### Scenario: Empty equipment item name rejection
- **WHEN** a recipe payload is submitted with an equipment item having an empty or whitespace name
- **THEN** the system MUST reject the creation with a validation error indicating that equipment name cannot be empty.

### Requirement: Recipe Updating via REST API
The system SHALL expose an HTTP REST endpoint (`PUT /api/recipes/:id`) that allows updating an existing recipe's title, description, servings, prep time, equipment, ingredients, and steps.

#### Scenario: Successful recipe update
- **WHEN** an authenticated user submits a valid update payload to `PUT /api/recipes/:id` for an existing recipe ID
- **THEN** the system MUST update the recipe attributes in storage, preserve the original creation timestamp, and return HTTP status 200 with the updated recipe object.

#### Scenario: Updating a non-existent recipe ID
- **WHEN** an update payload is submitted to `PUT /api/recipes/:id` for a recipe ID that does not exist in storage
- **THEN** the system MUST return HTTP status 404 Not Found with a clear error message.

### Requirement: Domain Validation on Update
The system SHALL re-validate all domain rules upon recipe update, including positive servings, positive prep time, non-empty ingredient/step lists, 1-indexed sequential step numbers, valid ingredient units, non-empty equipment names, and title uniqueness among the user's other recipes.

#### Scenario: Title collision during update
- **WHEN** a user updates a recipe's title to match another existing recipe title owned by that user
- **THEN** the system MUST reject the update with a validation error indicating that a recipe with this title already exists.

#### Scenario: Self-title update allowed
- **WHEN** a user updates a recipe without changing its title (or updating only description, ingredients, or steps)
- **THEN** the system MUST allow the update without triggering a duplicate title error on itself.

### Requirement: In-Place UI Editing
The system SHALL provide an in-place Edit Mode inside the recipe detail view (`RecipeDetail`), enabling inline modification of title, description, prep time, servings, equipment, ingredients, and step sequences without leaving the view.

#### Scenario: Inline editing toggle and save
- **WHEN** a user clicks the "Edit Recipe" button in the detail view
- **THEN** the view MUST switch into inline Edit Mode rendering editable form controls, allowing the user to modify attributes and click "Save Changes" to update the recipe.

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

### Requirement: Recipe Deletion via REST API
The system SHALL expose an HTTP REST endpoint (`DELETE /api/recipes/:id`) that deletes an existing recipe by ID and returns HTTP status 204 No Content.

#### Scenario: Successful recipe deletion
- **WHEN** an authenticated user issues a `DELETE /api/recipes/:id` request for an existing recipe ID
- **THEN** the system MUST remove the recipe from storage and return HTTP status 204 No Content.

#### Scenario: Deleting non-existent recipe ID
- **WHEN** a `DELETE /api/recipes/:id` request is issued for a recipe ID that does not exist in storage
- **THEN** the system MUST return HTTP status 404 Not Found with a JSON error payload.

### Requirement: Recipe Deletion Confirmation in UI
The system SHALL provide Delete action buttons in both the Recipe Detail view (`RecipeDetail`) and the Recipe Gallery cards (`RecipeGallery`), gating deletion behind an explicit modal confirmation dialog.

#### Scenario: User cancels deletion in modal
- **WHEN** a user clicks the Delete button in the Detail view or Gallery card and chooses "Cancel" in the confirmation modal
- **THEN** the modal MUST close without deleting the recipe or making a network request.

#### Scenario: User confirms deletion in modal
- **WHEN** a user clicks the Delete button and confirms deletion in the modal
- **THEN** the system MUST invoke `DELETE /api/recipes/:id`, remove the recipe from the UI state, and display feedback.

### Requirement: Automated Test Suite Teardown Cleanup
The integration and E2E test suites SHALL execute `DELETE /api/recipes/:id` in teardown hooks to delete all recipes generated during test runs.

#### Scenario: Test suite execution preserves clean database
- **WHEN** unit, integration, or Playwright E2E test suites finish running
- **THEN** all test-created recipes MUST be cleaned up from `./data/recipes.json` storage.

### Requirement: Visual Reordering of Ingredients and Steps
The recipe creation and edit forms SHALL provide `▲` (Move Up) and `▼` (Move Down) reorder controls (and `Alt+Up` / `Alt+Down` keyboard shortcuts) for every ingredient and step item row, automatically adjusting step numbers sequentially.

#### Scenario: Reordering steps
- **WHEN** a user clicks the Move Up or Move Down button on a step row (or presses `Alt+Up` / `Alt+Down`)
- **THEN** the form MUST swap the step positions and re-assign 1-indexed `step_number` attributes sequentially.

#### Scenario: Reordering ingredients
- **WHEN** a user clicks Move Up or Move Down on an ingredient row
- **THEN** the form MUST swap the ingredient positions in the list while preserving input values.

### Requirement: Keyboard-Driven Dynamic Row Creation
The recipe creation and edit forms SHALL automatically append a new row and focus its first input when a user presses `Enter` or `Tab` while focused on the final field of an ingredient, equipment, or step row.

#### Scenario: Pressing Enter on last step instruction
- **WHEN** a user is typing a step instruction and presses `Enter` (without `Shift`)
- **THEN** the form MUST append a new step row and automatically focus the new step textarea.

#### Scenario: Pressing Tab on last ingredient unit selector
- **WHEN** a user selects an ingredient unit in the last row and presses `Tab` or `Enter`
- **THEN** the form MUST append a new ingredient row and automatically focus the name input of the new row.

### Requirement: Keyboard-Driven Empty Row Deletion
The recipe creation and edit forms SHALL remove an empty item row and shift focus to the previous item when `Backspace` is pressed on an empty input field (when more than 1 item exists).

#### Scenario: Backspacing on empty step
- **WHEN** a user presses `Backspace` inside an empty step textarea
- **THEN** the system MUST delete that empty step row and place focus on the end of the previous step instruction.

### Requirement: Global Form Submission Shortcut
The recipe forms SHALL support submitting and saving changes using the `Cmd+Enter` (macOS) or `Ctrl+Enter` (Windows/Linux) keyboard shortcut from any form control.

#### Scenario: Submitting form via Cmd+Enter
- **WHEN** a user presses `Cmd+Enter` or `Ctrl+Enter` while focused on any form field
- **THEN** the form MUST trigger form submission and save changes immediately.

### Requirement: Automated GitHub Actions CI Workflow
The repository SHALL maintain a GitHub Actions workflow (`.github/workflows/ci.yml`) that executes on every `push` and `pull_request` to `main`, validating that all unit, HTTP integration, Playwright E2E tests pass and the production bundle builds without errors.

#### Scenario: Workflow execution on push or pull request
- **WHEN** a developer pushes a commit or opens a pull request targeting `main`
- **THEN** GitHub Actions MUST spin up a Node.js environment, install dependencies, run Vitest unit & integration tests (`npm run test`), run Playwright E2E browser tests (`npm run test:e2e`), and execute Vite build (`npm run build`).

### Requirement: PR Test Results Sticky Commenting
The CI workflow SHALL post or update an in-place sticky comment on Pull Requests summarizing test execution status and outcomes across unit, integration, E2E, and build steps.

#### Scenario: Updating PR comment on new commits
- **WHEN** a pull request triggers CI workflow execution
- **THEN** the workflow MUST publish or update a single sticky PR comment containing a Markdown status summary table without posting duplicate comment threads.

### Requirement: Failure Diagnostic Artifact Uploads
The CI workflow SHALL automatically capture and upload Playwright test failure artifacts (screenshots, video recordings, trace files) whenever E2E browser tests fail.

#### Scenario: E2E test failure artifact retention
- **WHEN** any Playwright E2E test step fails during CI execution
- **THEN** the workflow MUST execute `actions/upload-artifact@v4` to attach `test-results/` as a downloadable workflow artifact.

