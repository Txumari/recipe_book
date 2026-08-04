# Specification: Recipe Creation (recipe_creation.spec)

## 1. Context & Purpose
Allows users to register a new recipe into the system, validating that 
required attributes and nested data structures (ingredients and steps) 
adhere to domain constraints.

---

## 2. Attributes (Payload / Model Definitions)

* **title** (String, Required): Descriptive name of the recipe (e.g., "Spanish Omelette").
* **description** (String, Optional): A short summary or notes about the dish.
* **servings** (Integer, Required): Default number of servings. Must be > 0.
* **prep_time_minutes** (Integer, Required): Estimated preparation time in minutes. Must be > 0.
* **ingredients** (List<Ingredient>, Required): Array of ingredients. Must contain at least 1 item.
  * *name* (String, Required): Ingredient name (e.g., "Potatoes").
  * *amount* (Number, Required): Quantity required. Must be > 0.
  * *unit* (String/Enum, Required): Measurement unit (e.g., `grams`, `ml`, `unit`, `tbsp`).
* **steps** (List<Step>, Required): Ordered sequence of preparation steps. Must contain at least 1 item.
  * *step_number* (Integer, Required): Step sequence number (starting from 1).
  * *instruction* (String, Required): Detailed instructions for this step.

---

## 3. Scenarios & Validation Rules (Behavioral Requirements)

### Rule 1: Successful Recipe Creation
* **GIVEN** the user submits valid required payload attributes
* **WHEN** the creation request is processed
* **THEN** the recipe MUST be saved with status `draft` (or `published`)
* **AND** the system MUST return the newly generated recipe ID.

### Rule 2: Minimum Requirements & Domain Invariants
* **IF** `ingredients` list is empty OR `steps` list is empty:
  * **THEN** reject creation with validation error: `"A recipe must contain at least one ingredient and one step."`
* **IF** `servings` <= 0 OR `prep_time_minutes` <= 0:
  * **THEN** reject creation with validation error: `"Servings and prep time must be greater than zero."`

### Rule 3: Step Sequential Ordering
* **GIVEN** a list of steps (`steps`)
* **THEN** `step_number` values MUST be sequential starting from 1 with no gaps or duplicates (e.g., 1, 2, 3...).

### Rule 4: Duplicate Recipe Title
* **GIVEN** a recipe title that already exists for the current user
* **WHEN** the user attempts to create a recipe with the same title
* **THEN** reject creation with validation error: `"A recipe with this title already exists."`


