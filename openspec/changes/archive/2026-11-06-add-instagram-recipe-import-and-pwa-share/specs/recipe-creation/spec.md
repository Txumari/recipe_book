# Spec Delta

## ADDED Requirements

### Requirement: Optional Source URL Attribution
The system SHALL allow defining an optional `source_url` string on a recipe during creation and update, validating that any non-empty value is a valid `http://` or `https://` URL and rendering it as an external link in the recipe detail view.

#### Scenario: Recipe created with valid source_url
- **WHEN** a user submits a recipe payload containing a valid `source_url` (e.g., `https://www.instagram.com/p/ABC123/`)
- **THEN** the system MUST persist `source_url` on the recipe and display a clickable source link in the recipe detail view.

#### Scenario: Invalid source_url rejection
- **WHEN** a user submits a recipe creation or update payload containing a non-empty `source_url` that is not a valid `http://` or `https://` URL
- **THEN** the system MUST reject the request with a validation error indicating that `source_url` must be a valid HTTP/HTTPS URL.

## MODIFIED Requirements

### Requirement: Recipe Updating via REST API
The system SHALL expose an HTTP REST endpoint (`PUT /api/recipes/:id`) that allows updating an existing recipe's title, description, source_url, servings, prep time, equipment, ingredients, and steps.

#### Scenario: Successful recipe update
- **WHEN** an authenticated user submits a valid update payload to `PUT /api/recipes/:id` for an existing recipe ID
- **THEN** the system MUST update the recipe attributes in storage, preserve the original creation timestamp, and return HTTP status 200 with the updated recipe object.

#### Scenario: Updating a non-existent recipe ID
- **WHEN** an update payload is submitted to `PUT /api/recipes/:id` for a recipe ID that does not exist in storage
- **THEN** the system MUST return HTTP status 404 Not Found with a clear error message.

### Requirement: In-Place UI Editing
The system SHALL provide an in-place Edit Mode inside the recipe detail view (`RecipeDetail`), enabling inline modification of title, description, source_url, prep time, servings, equipment, ingredients, and step sequences without leaving the view.

#### Scenario: Inline editing toggle and save
- **WHEN** a user clicks the "Edit Recipe" button in the detail view
- **THEN** the view MUST switch into inline Edit Mode rendering editable form controls, allowing the user to modify attributes and click "Save Changes" to update the recipe.
