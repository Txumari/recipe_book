# Spec Delta

## Purpose

Lets a user plan one week of meals from their own recipes, using flexible daily meal slots, and keep that plan stored so they can view, adjust and reuse it from the web app or from connected AI agents.

## ADDED Requirements

### Requirement: Weekly Menu Structure
The system SHALL model a weekly menu as belonging to one user and one ISO week, identified by `week_start`: the Monday of that week as a `YYYY-MM-DD` date. A menu SHALL contain a list of meal entries. Each entry has a `day` (`monday` to `sunday`), a `slot` (`breakfast`, `lunch`, `snack` or `dinner`), a `recipe_id` and an optional `note`.

#### Scenario: Valid menu with flexible slots
- **WHEN** a user saves a menu for `week_start` `2026-11-09` with entries for Monday lunch, Monday dinner and Wednesday breakfast only
- **THEN** the system MUST accept the menu and store exactly those three entries, leaving every other day and slot empty

#### Scenario: Empty menu
- **WHEN** a user saves a menu for a valid `week_start` with an empty list of entries
- **THEN** the system MUST accept and store the menu with no meals

### Requirement: Week Start Must Be a Monday
The system SHALL reject a menu whose `week_start` is not a valid calendar date in `YYYY-MM-DD` format, or is not a Monday.

#### Scenario: Week start on a Wednesday
- **WHEN** a user saves a menu with `week_start` `2026-11-11` (a Wednesday)
- **THEN** the system MUST reject it with a validation error indicating that the week start must be a Monday in `YYYY-MM-DD` format

#### Scenario: Malformed week start
- **WHEN** a user saves a menu with `week_start` `11/09/2026` or `2026-02-30`
- **THEN** the system MUST reject it with the same validation error

### Requirement: One Recipe Per Day Slot
The system SHALL allow at most one meal entry for each combination of `day` and `slot` in a menu, and SHALL reject unknown `day` or `slot` values.

#### Scenario: Duplicate day and slot
- **WHEN** a menu is saved with two entries that both target Tuesday dinner
- **THEN** the system MUST reject it with a validation error naming the duplicated day and slot

#### Scenario: Unknown slot value
- **WHEN** a menu is saved with an entry whose slot is `brunch` or whose day is `funday`
- **THEN** the system MUST reject it with a validation error listing the allowed values

### Requirement: Menu Entries Reference the User's Own Recipes
The system SHALL accept a meal entry only if its `recipe_id` identifies an existing recipe owned by the same user at save time.

#### Scenario: Unknown recipe ID
- **WHEN** a user saves a menu containing a `recipe_id` that does not exist, or that belongs to another user
- **THEN** the system MUST reject the whole save with a validation error naming the unknown recipe ID, and MUST leave any previously stored menu for that week unchanged

### Requirement: Optional Meal Note Length
The system SHALL allow an optional free-text `note` of up to 200 characters on each meal entry (for example "double portion for leftovers"), and SHALL reject longer notes.

#### Scenario: Note too long
- **WHEN** a meal entry is saved with a note longer than 200 characters
- **THEN** the system MUST reject the menu with a validation error indicating the maximum note length

### Requirement: One Menu Per User Per Week
The system SHALL store at most one menu per user for each `week_start`. Saving a menu for a week that already has one SHALL replace its entries, keep its original creation timestamp and refresh its last-updated timestamp.

#### Scenario: Replacing an existing week
- **WHEN** a user saves a menu for a week that already has a stored menu
- **THEN** the system MUST replace the stored entries with the new ones, keep `createdAt` unchanged and set `updatedAt` to the save time

### Requirement: Menus Survive Recipe Deletion
When a referenced recipe is later deleted, the system SHALL keep the meal entry. It SHALL return the recipe title as it was at save time and flag the entry as no longer available. It SHALL NOT block the recipe's deletion.

#### Scenario: Reading a menu after a recipe is deleted
- **WHEN** a recipe used in a stored menu is deleted and the menu is then read
- **THEN** the system MUST return that entry with its saved `recipe_title` and `recipe_available: false`, while entries for existing recipes return `recipe_available: true`

#### Scenario: Editing a menu that contains a deleted recipe
- **WHEN** a menu is saved again with an entry kept unchanged from the stored menu (same day, slot and `recipe_id`) whose recipe has since been deleted
- **THEN** the system MUST accept that entry and keep its saved `recipe_title`, while a deleted recipe placed in any other day or slot MUST still be rejected as an unknown recipe

### Requirement: Menu Persistence
The system SHALL persist weekly menus so they survive application restarts. In local development, menus SHALL be stored in a JSON file `data/menus.json`, alongside `data/recipes.json`.

#### Scenario: Menu stored in local development
- **WHEN** a valid menu is saved while the application runs in local development
- **THEN** the system MUST write it to `data/menus.json` so it is still available after the application restarts

### Requirement: Menus Are Isolated Per User
The system SHALL scope every menu read, write and delete operation to the requesting user, identified the same way as for recipes.

#### Scenario: Another user's menu is invisible
- **WHEN** user B requests the menu for a week for which only user A has a menu
- **THEN** the system MUST respond as if no menu exists for that week

### Requirement: Weekly Menu REST API
The system SHALL expose `GET /api/menus`, `GET /api/menus/:weekStart`, `PUT /api/menus/:weekStart` and `DELETE /api/menus/:weekStart`, using the `x-user-id` header convention used by the recipe endpoints.

#### Scenario: Listing menus
- **WHEN** a client sends `GET /api/menus`
- **THEN** the system MUST return HTTP 200 with the user's menus ordered by `week_start`, most recent first

#### Scenario: Reading one week
- **WHEN** a client sends `GET /api/menus/2026-11-09` and a menu exists for that week
- **THEN** the system MUST return HTTP 200 with the menu, including each entry's `recipe_title` and `recipe_available`

#### Scenario: Reading a week without a menu
- **WHEN** a client sends `GET /api/menus/:weekStart` for a week with no stored menu
- **THEN** the system MUST return HTTP 404 with a JSON error payload

#### Scenario: Creating or replacing a week
- **WHEN** a client sends `PUT /api/menus/:weekStart` with a valid `{ meals: [...] }` body
- **THEN** the system MUST return HTTP 201 with the menu if it was newly created, or HTTP 200 if it replaced an existing menu

#### Scenario: Invalid menu payload
- **WHEN** a client sends `PUT /api/menus/:weekStart` with an invalid week start, duplicate slot, unknown recipe or over-long note
- **THEN** the system MUST return HTTP 400 with a JSON error payload describing the problem

#### Scenario: Deleting a week
- **WHEN** a client sends `DELETE /api/menus/:weekStart`
- **THEN** the system MUST return HTTP 204 if a menu was deleted, or HTTP 404 with a JSON error payload if none existed

### Requirement: Weekly Menu View in the Web UI
The web app SHALL provide a "Weekly Menu" view, reachable from the main header, that shows one week as a grid of seven days by the four slots. It SHALL open on the current week and offer previous-week and next-week navigation.

#### Scenario: Viewing a stored menu
- **WHEN** a user opens the Weekly Menu view for a week that has a stored menu
- **THEN** the view MUST show each assigned recipe title in its day and slot cell, and leave unassigned cells visibly empty

#### Scenario: Week without a menu
- **WHEN** a user opens a week with no stored menu
- **THEN** the view MUST show an empty grid and a message explaining that the menu can be filled here or by a connected AI agent

#### Scenario: Navigating weeks
- **WHEN** a user clicks the next-week or previous-week control
- **THEN** the view MUST load and display the menu for the adjacent Monday-starting week and show that week's date range

### Requirement: Opening a Recipe From the Menu
The Weekly Menu view SHALL let the user open the recipe detail view by clicking an assigned, available recipe. It SHALL show entries whose recipe was deleted as "no longer available", and those entries SHALL NOT be clickable.

#### Scenario: Clicking an assigned recipe
- **WHEN** a user clicks an available recipe title in a menu cell
- **THEN** the app MUST open that recipe's detail view

#### Scenario: Deleted recipe in a cell
- **WHEN** a menu cell refers to a recipe that no longer exists
- **THEN** the cell MUST show the saved title marked as no longer available, and MUST NOT navigate anywhere when clicked

### Requirement: Editing Menu Slots in the Web UI
The Weekly Menu view SHALL let the user assign one of their recipes to any empty or filled cell and clear any filled cell. Each change SHALL be saved immediately, creating the week's menu if it does not exist yet.

#### Scenario: Assigning a recipe to a slot
- **WHEN** a user picks a recipe for Thursday dinner in the Weekly Menu view
- **THEN** the app MUST save the menu for that week with the new entry and display the recipe title in the Thursday dinner cell

#### Scenario: Clearing a slot
- **WHEN** a user clears a filled cell
- **THEN** the app MUST save the menu without that entry and show the cell as empty

### Requirement: Deleting a Menu in the Web UI
The Weekly Menu view SHALL provide a delete action for the displayed week's menu, protected by the existing confirmation modal.

#### Scenario: Confirming menu deletion
- **WHEN** a user clicks delete on a week's menu and confirms in the modal
- **THEN** the app MUST delete the menu through the API and show the empty grid for that week

#### Scenario: Cancelling menu deletion
- **WHEN** a user clicks delete and chooses Cancel in the modal
- **THEN** the modal MUST close without deleting the menu or making a network request

### Requirement: Weekly Menu Test Coverage
The project test suite SHALL cover the weekly menu rules with unit tests, the `/api/menus` endpoints with HTTP integration tests, and the Weekly Menu view with a browser E2E test. Teardown SHALL remove the menus and recipes created during each run.

#### Scenario: Test run leaves no menu data behind
- **WHEN** the unit, integration and E2E suites finish
- **THEN** every menu and recipe created by those tests MUST have been deleted from storage
