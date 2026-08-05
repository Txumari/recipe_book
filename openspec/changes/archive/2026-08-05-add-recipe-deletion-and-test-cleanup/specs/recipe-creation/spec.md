## ADDED Requirements

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
