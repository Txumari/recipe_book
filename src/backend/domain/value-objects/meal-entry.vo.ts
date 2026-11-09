import { InvalidMenuPayloadError } from '../errors/menu-domain.error.ts';

export const MEAL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export const MEAL_SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
export const MAX_MEAL_NOTE_LENGTH = 200;

export type MealDay = (typeof MEAL_DAYS)[number];
export type MealSlot = (typeof MEAL_SLOTS)[number];

export interface MealEntryProps {
  day: string;
  slot: string;
  recipe_id: string;
  /** Recipe title snapshot taken when the menu is saved. */
  recipe_title?: string;
  note?: string | null;
}

export class MealEntry {
  private constructor(
    readonly day: MealDay,
    readonly slot: MealSlot,
    readonly recipe_id: string,
    readonly recipe_title: string | undefined,
    readonly note: string | undefined
  ) {}

  public static create(props: MealEntryProps): MealEntry {
    if (!props || typeof props !== 'object') {
      throw new InvalidMenuPayloadError('Each meal entry must be an object with day, slot and recipe_id.');
    }

    if (!MEAL_DAYS.includes(props.day as MealDay)) {
      throw new InvalidMenuPayloadError(
        `Invalid meal day "${props.day}". Allowed values: ${MEAL_DAYS.join(', ')}.`
      );
    }

    if (!MEAL_SLOTS.includes(props.slot as MealSlot)) {
      throw new InvalidMenuPayloadError(
        `Invalid meal slot "${props.slot}". Allowed values: ${MEAL_SLOTS.join(', ')}.`
      );
    }

    if (typeof props.recipe_id !== 'string' || props.recipe_id.trim().length === 0) {
      throw new InvalidMenuPayloadError('Each meal entry must have a non-empty recipe_id.');
    }

    let note: string | undefined;
    if (props.note !== undefined && props.note !== null) {
      if (typeof props.note !== 'string') {
        throw new InvalidMenuPayloadError('Meal note must be a string.');
      }
      const trimmed = props.note.trim();
      if (trimmed.length > MAX_MEAL_NOTE_LENGTH) {
        throw new InvalidMenuPayloadError(
          `Meal note cannot be longer than ${MAX_MEAL_NOTE_LENGTH} characters.`
        );
      }
      note = trimmed.length > 0 ? trimmed : undefined;
    }

    const recipeTitle = typeof props.recipe_title === 'string' ? props.recipe_title : undefined;

    return new MealEntry(
      props.day as MealDay,
      props.slot as MealSlot,
      props.recipe_id.trim(),
      recipeTitle,
      note
    );
  }

  public withRecipeTitle(title: string): MealEntry {
    return new MealEntry(this.day, this.slot, this.recipe_id, title, this.note);
  }
}
