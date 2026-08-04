## ADDED Requirements

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
