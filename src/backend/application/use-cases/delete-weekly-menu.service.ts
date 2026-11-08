import { DeleteWeeklyMenuUseCase } from '../ports/delete-weekly-menu.use-case.ts';
import { parseWeekStart } from '../../domain/value-objects/week-start.vo.ts';
import { MenuNotFoundError } from '../../domain/errors/menu-domain.error.ts';
import { WeeklyMenuRepositoryPort } from '../ports/weekly-menu-repository.port.ts';

export class DeleteWeeklyMenuService implements DeleteWeeklyMenuUseCase {
  constructor(private readonly menuRepository: WeeklyMenuRepositoryPort) {}

  public async execute(userId: string, weekStart: string): Promise<void> {
    const week = parseWeekStart(weekStart);
    const deleted = await this.menuRepository.deleteByWeek(userId, week);
    if (!deleted) {
      throw new MenuNotFoundError(week);
    }
  }
}
