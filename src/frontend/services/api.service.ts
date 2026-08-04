export type IngredientUnit =
  | 'grams'
  | 'kg'
  | 'ml'
  | 'l'
  | 'tbsp'
  | 'tsp'
  | 'cup'
  | 'pinch'
  | 'unit'
  | 'clove'
  | 'slice'
  | 'splash';

export interface Equipment {
  name: string;
  specification?: string;
  is_optional?: boolean;
}

export interface Ingredient {
  name: string;
  amount: number;
  unit: IngredientUnit;
}

export interface Step {
  step_number: number;
  instruction: string;
}

export interface Recipe {
  id: string;
  userId: string;
  title: string;
  description?: string;
  servings: number;
  prep_time_minutes: number;
  equipment?: Equipment[];
  ingredients: Ingredient[];
  steps: Step[];
  createdAt: string;
}

export interface CreateRecipeDto {
  title: string;
  description?: string;
  servings: number;
  prep_time_minutes: number;
  equipment?: Equipment[];
  ingredients: Ingredient[];
  steps: Step[];
}

const API_BASE = '/api';

export async function fetchRecipes(): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE}/recipes`, {
    headers: { 'x-user-id': 'default-local-user' },
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to fetch recipes');
  }
  return response.json();
}

export async function createRecipe(dto: CreateRecipeDto): Promise<Recipe> {
  const response = await fetch(`${API_BASE}/recipes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'default-local-user',
    },
    body: JSON.stringify(dto),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create recipe');
  }
  return data;
}
