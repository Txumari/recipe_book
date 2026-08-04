## ADDED Requirements

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
