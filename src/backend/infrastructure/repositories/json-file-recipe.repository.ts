import fs from 'fs';
import path from 'path';
import { RecipeRepositoryPort } from '../../application/ports/recipe-repository.port.ts';
import { Recipe } from '../../domain/entities/recipe.entity.ts';

export class JsonFileRecipeRepository implements RecipeRepositoryPort {
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.resolve(process.cwd(), 'data', 'recipes.json');
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

  private readAllRaw(): any[] {
    try {
      this.ensureFileExists();
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content || '[]');
    } catch {
      return [];
    }
  }

  private writeAllRaw(recipes: any[]): void {
    this.ensureFileExists();
    fs.writeFileSync(this.filePath, JSON.stringify(recipes, null, 2), 'utf-8');
  }

  private rawToEntity(raw: any): Recipe {
    return Recipe.create({
      id: raw.id,
      userId: raw.userId,
      title: raw.title,
      description: raw.description,
      servings: raw.servings,
      prep_time_minutes: raw.prep_time_minutes,
      equipment: raw.equipment || [],
      ingredients: raw.ingredients,
      steps: raw.steps,
      createdAt: raw.createdAt,
    });
  }

  public async save(recipe: Recipe): Promise<Recipe> {
    const recipes = this.readAllRaw();
    const existingIndex = recipes.findIndex(r => r.id === recipe.id);
    
    const plainRecipe = {
      id: recipe.id,
      userId: recipe.userId,
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      prep_time_minutes: recipe.prep_time_minutes,
      equipment: recipe.equipment.map(e => ({
        name: e.name,
        specification: e.specification,
        is_optional: e.is_optional,
      })),
      ingredients: recipe.ingredients.map(i => ({ name: i.name, amount: i.amount, unit: i.unit })),
      steps: recipe.steps.map(s => ({ step_number: s.step_number, instruction: s.instruction })),
      createdAt: recipe.createdAt,
    };

    if (existingIndex >= 0) {
      recipes[existingIndex] = plainRecipe;
    } else {
      recipes.push(plainRecipe);
    }

    this.writeAllRaw(recipes);
    return recipe;
  }

  public async findById(userId: string, id: string): Promise<Recipe | null> {
    const recipes = this.readAllRaw();
    const found = recipes.find(r => r.userId === userId && r.id === id);
    if (!found) return null;
    return this.rawToEntity(found);
  }

  public async findByTitle(userId: string, title: string): Promise<Recipe | null> {
    const recipes = this.readAllRaw();
    const normalizedTarget = title.trim().toLowerCase();
    const found = recipes.find(
      r => r.userId === userId && r.title.trim().toLowerCase() === normalizedTarget
    );

    if (!found) return null;
    return this.rawToEntity(found);
  }

  public async findAll(userId: string): Promise<Recipe[]> {
    const recipes = this.readAllRaw();
    return recipes
      .filter(r => r.userId === userId)
      .map(r => this.rawToEntity(r));
  }
}
