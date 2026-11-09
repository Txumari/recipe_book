import { GetWeeklyMenuUseCase } from '../ports/get-weekly-menu.use-case.ts';
import { parseWeekStart } from '../../domain/value-objects/week-start.vo.ts';
import { WeeklyMenuRepositoryPort } from '../ports/weekly-menu-repository.port.ts';
import { RecipeRepositoryPort } from '../ports/recipe-repository.port.ts';
import { WeeklyMenuView } from '../dtos/menu.dto.ts';
import { MenuViewMapper } from './menu-view.mapper.ts';

export class GetWeeklyMenuService implements GetWeeklyMenuUseCase {
  private readonly mapper: MenuViewMapper;

  constructor(
    private readonly menuRepository: WeeklyMenuRepositoryPort,
    recipeRepository: RecipeRepositoryPort
  ) {
    this.mapper = new MenuViewMapper(recipeRepository);
  }

  /** Returns null when the week has no menu. */
  public async execute(userId: string, weekStart: string): Promise<WeeklyMenuView | null> {
    const week = parseWeekStart(weekStart);
    const menu = await this.menuRepository.findByWeek(userId, week);
    return menu ? this.mapper.toView(menu) : null;
  }
}
