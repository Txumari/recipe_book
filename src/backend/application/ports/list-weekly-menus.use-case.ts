import { WeeklyMenuView } from '../dtos/menu.dto.ts';

export interface ListWeeklyMenusUseCase {
  /** All menus of the user, most recent week first. */
  execute(userId: string): Promise<WeeklyMenuView[]>;
}
