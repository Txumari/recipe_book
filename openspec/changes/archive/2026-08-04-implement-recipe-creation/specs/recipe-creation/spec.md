## Purpose

Allows users to register a new recipe into the system, validating that required attributes and nested data structures (ingredients and steps) adhere to domain constraints.

## ADDED Requirements

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
