import { WeeklyMenuView } from '../dtos/menu.dto.ts';

export interface GetWeeklyMenuUseCase {
  /** Returns null when the user has no menu for that week. */
  execute(userId: string, weekStart: string): Promise<WeeklyMenuView | null>;
}
