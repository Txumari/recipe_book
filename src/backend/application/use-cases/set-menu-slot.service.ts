import { parseWeekStart } from '../../domain/value-objects/week-start.vo.ts';
import { MealEntry } from '../../domain/value-objects/meal-entry.vo.ts';
import { WeeklyMenuRepositoryPort } from '../ports/weekly-menu-repository.port.ts';
import { MealEntryInputDto, SaveWeeklyMenuResult, SetMenuSlotInput } from '../dtos/menu.dto.ts';
import { SaveWeeklyMenuUseCase } from '../ports/save-weekly-menu.use-case.ts';
import { SetMenuSlotUseCase } from '../ports/set-menu-slot.use-case.ts';

/** Assigns or clears exactly one day/slot, creating the week's menu if needed. */
export class SetMenuSlotService implements SetMenuSlotUseCase {
  constructor(
    private readonly menuRepository: WeeklyMenuRepositoryPort,
    private readonly saveWeeklyMenuService: SaveWeeklyMenuUseCase
  ) {}

  public async execute(userId: string, weekStart: string, input: SetMenuSlotInput): Promise<SaveWeeklyMenuResult> {
    const week = parseWeekStart(weekStart);

    // Validate the targeted day/slot even when clearing (recipe_id is a placeholder here).
    MealEntry.create({ day: input.day, slot: input.slot, recipe_id: input.recipe_id ?? 'placeholder', note: input.note });

    const existing = await this.menuRepository.findByWeek(userId, week);
    const meals: MealEntryInputDto[] = (existing?.meals ?? [])
      .filter(m => !(m.day === input.day && m.slot === input.slot))
      .map(m => ({ day: m.day, slot: m.slot, recipe_id: m.recipe_id, note: m.note }));

    if (input.recipe_id !== null) {
      meals.push({ day: input.day, slot: input.slot, recipe_id: input.recipe_id, note: input.note });
    }

    return this.saveWeeklyMenuService.execute(userId, week, meals);
  }
}
