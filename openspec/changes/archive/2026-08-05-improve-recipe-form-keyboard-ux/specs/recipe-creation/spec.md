## ADDED Requirements

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
