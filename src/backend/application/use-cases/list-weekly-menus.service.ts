import { WeeklyMenuRepositoryPort } from '../ports/weekly-menu-repository.port.ts';
import { RecipeRepositoryPort } from '../ports/recipe-repository.port.ts';
import { WeeklyMenuView } from '../dtos/menu.dto.ts';
import { MenuViewMapper } from './menu-view.mapper.ts';

export class ListWeeklyMenusService {
  private readonly mapper: MenuViewMapper;

  constructor(
    private readonly menuRepository: WeeklyMenuRepositoryPort,
    recipeRepository: RecipeRepositoryPort
  ) {
    this.mapper = new MenuViewMapper(recipeRepository);
  }

  /** The user's menus, most recent week first. */
  public async execute(userId: string): Promise<WeeklyMenuView[]> {
    const menus = await this.menuRepository.findAll(userId);
    menus.sort((a, b) => b.week_start.localeCompare(a.week_start));
    return this.mapper.toViews(userId, menus);
  }
}
