import { MealEntryInputDto, SaveWeeklyMenuResult } from '../dtos/menu.dto.ts';

export interface SaveWeeklyMenuUseCase {
  /** Creates or replaces the whole menu of one week. */
  execute(userId: string, weekStart: string, meals: MealEntryInputDto[]): Promise<SaveWeeklyMenuResult>;
}
