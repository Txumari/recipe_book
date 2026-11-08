/** A meal entry as sent by clients (REST body or MCP tool input). */
export interface MealEntryInputDto {
  day: string;
  slot: string;
  recipe_id: string;
  note?: string | null;
}

/** A meal entry as returned to clients. */
export interface MealEntryView {
  day: string;
  slot: string;
  recipe_id: string;
  recipe_title: string;
  /** false when the referenced recipe has been deleted since the menu was saved. */
  recipe_available: boolean;
  note?: string;
}

export interface WeeklyMenuView {
  id: string;
  week_start: string;
  meals: MealEntryView[];
  createdAt: string;
  updatedAt: string;
}

export interface SaveWeeklyMenuResult {
  menu: WeeklyMenuView;
  /** true when the week had no menu before this save. */
  created: boolean;
}
