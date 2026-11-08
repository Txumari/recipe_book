import { WeeklyMenu } from '../../domain/entities/weekly-menu.entity.ts';
import { parseWeekStart } from '../../domain/value-objects/week-start.vo.ts';
import { UnknownMenuRecipeError } from '../../domain/errors/menu-domain.error.ts';
import { RecipeRepositoryPort } from '../ports/recipe-repository.port.ts';
import { WeeklyMenuRepositoryPort } from '../ports/weekly-menu-repository.port.ts';
import { MealEntryInputDto, SaveWeeklyMenuResult } from '../dtos/menu.dto.ts';
import { MenuViewMapper } from './menu-view.mapper.ts';

/** Creates or replaces the menu of one week (shared by REST and MCP). */
export class SaveWeeklyMenuService {
  private readonly mapper: MenuViewMapper;

  constructor(
    private readonly menuRepository: WeeklyMenuRepositoryPort,
    private readonly recipeRepository: RecipeRepositoryPort
  ) {
    this.mapper = new MenuViewMapper(recipeRepository);
  }

  public async execute(userId: string, weekStart: string, meals: MealEntryInputDto[]): Promise<SaveWeeklyMenuResult> {
    const week = parseWeekStart(weekStart);

    // 1. Structural validation (days, slots, notes, duplicates) before touching storage.
    const draft = WeeklyMenu.create({ userId, week_start: week, meals });

    const existing = await this.menuRepository.findByWeek(userId, week);

    // Entries kept unchanged from the stored menu (same day, slot and recipe) keep their
    // title snapshot even if that recipe was deleted since, so a menu stays editable.
    const carriedOver = new Map<string, string>();
    for (const m of existing?.meals ?? []) {
      carriedOver.set(`${m.day}:${m.slot}:${m.recipe_id}`, m.recipe_title ?? '');
    }

    // 2. Every newly referenced recipe must exist for this user; snapshot titles.
    const titles = new Map<string, string>();
    for (const recipeId of draft.recipeIds()) {
      const recipe = await this.recipeRepository.findById(userId, recipeId);
      if (recipe) {
        titles.set(recipeId, recipe.title);
      }
    }

    const titledMeals = draft.meals.map(m => {
      const title = titles.get(m.recipe_id) ?? carriedOver.get(`${m.day}:${m.slot}:${m.recipe_id}`);
      if (title === undefined) {
        throw new UnknownMenuRecipeError(m.recipe_id);
      }
      return { day: m.day, slot: m.slot, recipe_id: m.recipe_id, recipe_title: title, note: m.note };
    });

    // 3. Keep identity and creation time when replacing an existing week.
    const menu = WeeklyMenu.create({
      id: existing?.id,
      userId,
      week_start: week,
      meals: titledMeals,
      createdAt: existing?.createdAt,
      updatedAt: new Date().toISOString(),
    });

    const saved = await this.menuRepository.save(menu);
    return { menu: await this.mapper.toView(saved), created: !existing };
  }
}
