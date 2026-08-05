## Context

See proposal.md for motivation and `specs/recipe-creation/spec.md` for requirements.

## Goals / Non-Goals

**Goals:**
- Implement visual reordering controls (`▲` Move Up, `▼` Move Down) for ingredients and steps.
- Support `Alt+Up` / `Alt+Down` keyboard shortcuts for reordering rows when focused inside a row.
- Support `Enter` / `Tab` to append next ingredient, step, or equipment row and auto-focus its first input.
- Support `Shift+Enter` for multi-line instruction text inside a step.
- Support `Backspace` on empty fields to delete empty rows and focus previous items.
- Support `Cmd+Enter` (Mac) / `Ctrl+Enter` (Win/Linux) global shortcut to submit form from anywhere.
- Add visual keyboard hint badges (e.g. `↵ Enter for next step | ⌥▲/▼ Reorder | ⌘↵ Save`).

**Non-Goals:**
- Heavy external drag-and-drop npm packages (keep UI clean, lightweight, and fast with vanilla CSS and array index swapping).

## Decisions

### 1. Item Array Reordering Logic
- **Decision:** Implement generic `moveItem<T>(list: T[], index: number, direction: 'up' | 'down')`:
  ```typescript
  const moveItem = <T,>(list: T[], index: number, direction: 'up' | 'down'): T[] => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return list;
    const next = [...list];
    const [temp] = next.splice(index, 1);
    next.splice(targetIndex, 0, temp);
    return next;
  };
  ```
  For steps, automatically re-map `step_number: idx + 1` across all reordered steps.
- **Rationale:** Fast, zero-dependency, predictable reordering that works equally well via touch, click (`▲`/`▼`), and keyboard (`Alt+Up`/`Alt+Down`).

### 2. Keyboard Event Routing
- **Step Textarea**:
  - `Enter` (without `Shift`): Appends a new step row and focuses it.
  - `Shift+Enter`: Inserts a standard newline into the current step textarea.
  - `Alt+Up` / `Alt+Down`: Moves current step up/down in the list.
  - `Backspace` (when textarea is completely empty and >1 step exists): Deletes current step row and focuses the preceding step textarea.
- **Ingredient Row (Unit Select / Amount)**:
  - `Enter` or `Tab` (on last item's last input): Appends new ingredient row and focuses its name input.
  - `Alt+Up` / `Alt+Down`: Moves current ingredient up/down in the list.
  - `Backspace` (when name input is empty and >1 ingredient exists): Removes empty ingredient row and focuses previous ingredient.
- **Global**:
  - `Cmd+Enter` / `Ctrl+Enter`: Calls form `submit` handler.

## Risks / Trade-offs

- [Risk] Moving step 1 up or last step down could throw index errors.
  → [Mitigation] Disable `▲` button when `index === 0` and `▼` button when `index === list.length - 1`.
