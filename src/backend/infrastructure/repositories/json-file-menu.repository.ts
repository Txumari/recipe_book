import fs from 'fs';
import path from 'path';
import { WeeklyMenuRepositoryPort } from '../../application/ports/weekly-menu-repository.port.ts';
import { WeeklyMenu, WeeklyMenuProps } from '../../domain/entities/weekly-menu.entity.ts';

/** Local-development menu storage in `data/menus.json`, next to `recipes.json`. */
export class JsonFileMenuRepository implements WeeklyMenuRepositoryPort {
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.resolve(process.cwd(), 'data', 'menus.json');
    this.ensureFileExists();
  }

  private ensureFileExists(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  /** Throws on unreadable or corrupt storage, so a failed read can never turn into an overwrite. */
  private readAllRaw(): WeeklyMenuProps[] {
    this.ensureFileExists();
    const content = fs.readFileSync(this.filePath, 'utf-8');
    const parsed = JSON.parse(content || '[]');
    if (!Array.isArray(parsed)) {
      throw new Error(`Menu storage at ${this.filePath} is corrupt: expected a JSON array.`);
    }
    return parsed;
  }

  private writeAllRaw(menus: WeeklyMenuProps[]): void {
    this.ensureFileExists();
    fs.writeFileSync(this.filePath, JSON.stringify(menus, null, 2), 'utf-8');
  }

  public async findByWeek(userId: string, weekStart: string): Promise<WeeklyMenu | null> {
    const found = this.readAllRaw().find(m => m.userId === userId && m.week_start === weekStart);
    return found ? WeeklyMenu.create(found) : null;
  }

  public async findAll(userId: string): Promise<WeeklyMenu[]> {
    return this.readAllRaw()
      .filter(m => m.userId === userId)
      .sort((a, b) => b.week_start.localeCompare(a.week_start))
      .map(m => WeeklyMenu.create(m));
  }

  public async save(menu: WeeklyMenu): Promise<WeeklyMenu> {
    const menus = this.readAllRaw();
    const plain = menu.toProps();
    const index = menus.findIndex(m => m.userId === menu.userId && m.week_start === menu.week_start);
    if (index >= 0) {
      menus[index] = plain;
    } else {
      menus.push(plain);
    }
    this.writeAllRaw(menus);
    return menu;
  }

  public async deleteByWeek(userId: string, weekStart: string): Promise<boolean> {
    const menus = this.readAllRaw();
    const filtered = menus.filter(m => !(m.userId === userId && m.week_start === weekStart));
    if (filtered.length === menus.length) {
      return false;
    }
    this.writeAllRaw(filtered);
    return true;
  }
}
