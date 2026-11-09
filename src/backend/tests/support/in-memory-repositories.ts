import { RecipeRepositoryPort } from '../../application/ports/recipe-repository.port.ts';
import { WeeklyMenuRepositoryPort } from '../../application/ports/weekly-menu-repository.port.ts';
import { Recipe } from '../../domain/entities/recipe.entity.ts';
import { WeeklyMenu } from '../../domain/entities/weekly-menu.entity.ts';

export class InMemoryRecipeRepository implements RecipeRepositoryPort {
  private recipes: Recipe[] = [];

  async save(recipe: Recipe): Promise<Recipe> {
    this.recipes = this.recipes.filter(r => r.id !== recipe.id).concat(recipe);
    return recipe;
  }
  async findById(userId: string, id: string): Promise<Recipe | null> {
    return this.recipes.find(r => r.userId === userId && r.id === id) ?? null;
  }
  async findByTitle(userId: string, title: string): Promise<Recipe | null> {
    const t = title.trim().toLowerCase();
    return this.recipes.find(r => r.userId === userId && r.title.toLowerCase() === t) ?? null;
  }
  async findAll(userId: string): Promise<Recipe[]> {
    return this.recipes.filter(r => r.userId === userId);
  }
  async deleteById(userId: string, id: string): Promise<boolean> {
    const before = this.recipes.length;
    this.recipes = this.recipes.filter(r => !(r.userId === userId && r.id === id));
    return this.recipes.length !== before;
  }
}

export class InMemoryMenuRepository implements WeeklyMenuRepositoryPort {
  private menus: WeeklyMenu[] = [];

  async findByWeek(userId: string, weekStart: string): Promise<WeeklyMenu | null> {
    return this.menus.find(m => m.userId === userId && m.week_start === weekStart) ?? null;
  }
  async findAll(userId: string): Promise<WeeklyMenu[]> {
    return this.menus
      .filter(m => m.userId === userId)
      .sort((a, b) => b.week_start.localeCompare(a.week_start));
  }
  async save(menu: WeeklyMenu): Promise<WeeklyMenu> {
    this.menus = this.menus
      .filter(m => !(m.userId === menu.userId && m.week_start === menu.week_start))
      .concat(menu);
    return menu;
  }
  async deleteByWeek(userId: string, weekStart: string): Promise<boolean> {
    const before = this.menus.length;
    this.menus = this.menus.filter(m => !(m.userId === userId && m.week_start === weekStart));
    return this.menus.length !== before;
  }
}

let counter = 0;

export function makeRecipe(
  userId: string,
  title: string,
  overrides: { prep_time_minutes?: number; ingredients?: string[]; description?: string } = {}
): Recipe {
  counter += 1;
  return Recipe.create({
    id: `recipe-test-${counter}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    title,
    description: overrides.description,
    servings: 2,
    prep_time_minutes: overrides.prep_time_minutes ?? 20,
    ingredients: (overrides.ingredients ?? ['Salt']).map(name => ({ name, amount: 1, unit: 'unit' as const })),
    steps: [{ step_number: 1, instruction: 'Cook it' }],
  });
}
