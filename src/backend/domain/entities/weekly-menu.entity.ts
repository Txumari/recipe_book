import { WeekStart, parseWeekStart } from '../value-objects/week-start.vo.ts';
import { MealEntry, MealEntryProps, MEAL_DAYS, MEAL_SLOTS } from '../value-objects/meal-entry.vo.ts';
import { InvalidMenuPayloadError } from '../errors/menu-domain.error.ts';

export interface WeeklyMenuProps {
  id?: string;
  userId: string;
  week_start: string;
  meals: MealEntryProps[];
  createdAt?: string;
  updatedAt?: string;
}

function compareEntries(a: MealEntry, b: MealEntry): number {
  const byDay = MEAL_DAYS.indexOf(a.day) - MEAL_DAYS.indexOf(b.day);
  return byDay !== 0 ? byDay : MEAL_SLOTS.indexOf(a.slot) - MEAL_SLOTS.indexOf(b.slot);
}

export class WeeklyMenu {
  private constructor(
    readonly id: string,
    readonly userId: string,
    readonly week_start: WeekStart,
    readonly meals: MealEntry[],
    readonly createdAt: string,
    readonly updatedAt: string
  ) {}

  public static create(props: WeeklyMenuProps): WeeklyMenu {
    const weekStart = parseWeekStart(props.week_start);

    if (!Array.isArray(props.meals)) {
      throw new InvalidMenuPayloadError('A weekly menu must have a "meals" array (it may be empty).');
    }

    const meals = props.meals.map(m => MealEntry.create(m));

    const seen = new Set<string>();
    for (const meal of meals) {
      const key = `${meal.day}:${meal.slot}`;
      if (seen.has(key)) {
        throw new InvalidMenuPayloadError(
          `Duplicate meal for ${meal.day} ${meal.slot}. Each day and slot can hold only one recipe.`
        );
      }
      seen.add(key);
    }

    meals.sort(compareEntries);

    const now = new Date().toISOString();
    const createdAt = props.createdAt || now;

    return new WeeklyMenu(
      props.id || `menu-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      props.userId || 'default-local-user',
      weekStart,
      meals,
      createdAt,
      props.updatedAt || createdAt
    );
  }

  /** Recipe IDs referenced by the menu, without duplicates. */
  public recipeIds(): string[] {
    return [...new Set(this.meals.map(m => m.recipe_id))];
  }

  public withRecipeTitles(titles: Map<string, string>): WeeklyMenu {
    return new WeeklyMenu(
      this.id,
      this.userId,
      this.week_start,
      this.meals.map(m => m.withRecipeTitle(titles.get(m.recipe_id) ?? m.recipe_title ?? '')),
      this.createdAt,
      this.updatedAt
    );
  }

  public toProps(): WeeklyMenuProps {
    return {
      id: this.id,
      userId: this.userId,
      week_start: this.week_start,
      meals: this.meals.map(m => ({
        day: m.day,
        slot: m.slot,
        recipe_id: m.recipe_id,
        recipe_title: m.recipe_title,
        ...(m.note !== undefined ? { note: m.note } : {}),
      })),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
