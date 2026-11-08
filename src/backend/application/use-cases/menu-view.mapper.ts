import { WeeklyMenu } from '../../domain/entities/weekly-menu.entity.ts';
import { RecipeRepositoryPort } from '../ports/recipe-repository.port.ts';
import { WeeklyMenuView } from '../dtos/menu.dto.ts';

/** Builds client views, computing `recipe_available` against the user's current recipes. */
export class MenuViewMapper {
  constructor(private readonly recipeRepository: RecipeRepositoryPort) {}

  public async toView(menu: WeeklyMenu): Promise<WeeklyMenuView> {
    const [view] = await this.toViews(menu.userId, [menu]);
    return view;
  }

  public async toViews(userId: string, menus: WeeklyMenu[]): Promise<WeeklyMenuView[]> {
    if (menus.length === 0) return [];
    const existingIds = new Set((await this.recipeRepository.findAll(userId)).map(r => r.id));
    return menus.map(menu => ({
      id: menu.id,
      week_start: menu.week_start,
      meals: menu.meals.map(m => ({
        day: m.day,
        slot: m.slot,
        recipe_id: m.recipe_id,
        recipe_title: m.recipe_title ?? '',
        recipe_available: existingIds.has(m.recipe_id),
        ...(m.note !== undefined ? { note: m.note } : {}),
      })),
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt,
    }));
  }
}
