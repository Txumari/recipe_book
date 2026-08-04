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

/**
 * Safely parses HTTP response without throwing unhandled SyntaxError on non-JSON HTML/text error pages.
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    if (isJson) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status} Error`);
    } else {
      const text = await response.text().catch(() => '');
      throw new Error(`Server error (${response.status}): ${text.slice(0, 100) || response.statusText}`);
    }
  }

  if (isJson) {
    return response.json();
  }

  // Fallback for 204 No Content or empty JSON
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export async function fetchRecipes(): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE}/recipes`, {
    headers: { 'x-user-id': 'default-local-user' },
  });
  return parseResponse<Recipe[]>(response);
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
  return parseResponse<Recipe>(response);
}

export async function updateRecipe(id: string, dto: CreateRecipeDto): Promise<Recipe> {
  const response = await fetch(`${API_BASE}/recipes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'default-local-user',
    },
    body: JSON.stringify(dto),
  });
  return parseResponse<Recipe>(response);
}
