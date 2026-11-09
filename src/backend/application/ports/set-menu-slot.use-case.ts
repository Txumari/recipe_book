import { SaveWeeklyMenuResult, SetMenuSlotInput } from '../dtos/menu.dto.ts';

export interface SetMenuSlotUseCase {
  /** Assigns or clears exactly one day/slot, creating the week's menu if needed. */
  execute(userId: string, weekStart: string, input: SetMenuSlotInput): Promise<SaveWeeklyMenuResult>;
}
