import { WeeklyMenu } from '../../domain/entities/weekly-menu.entity.ts';

/**
 * Storage-agnostic port for weekly menus. Local development uses a JSON file
 * adapter; a Postgres adapter can implement the same contract later.
 */
export interface WeeklyMenuRepositoryPort {
  findByWeek(userId: string, weekStart: string): Promise<WeeklyMenu | null>;
  /** All menus of the user, most recent week first. */
  findAll(userId: string): Promise<WeeklyMenu[]>;
  /** Inserts or replaces the menu identified by (userId, week_start). */
  save(menu: WeeklyMenu): Promise<WeeklyMenu>;
  deleteByWeek(userId: string, weekStart: string): Promise<boolean>;
}
