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
  source_url?: string;
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
  source_url?: string;
  servings: number;
  prep_time_minutes: number;
  equipment?: Equipment[];
  ingredients: Ingredient[];
  steps: Step[];
}

export interface ParseRecipePayload {
  url?: string;
  text?: string;
}

export interface ParsedRecipeDraft {
  title?: string;
  description?: string;
  source_url?: string;
  text?: string;
  servings?: number;
  prep_time_minutes?: number;
  equipment?: Equipment[];
  ingredients?: Ingredient[];
  steps?: Step[];
  parser_used: 'gemini' | 'openai-compatible' | 'heuristic';
  extraction_warning?: string;
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

export async function deleteRecipe(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/recipes/${id}`, {
    method: 'DELETE',
    headers: {
      'x-user-id': 'default-local-user',
    },
  });
  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to delete recipe');
    }
    const text = await response.text().catch(() => '');
    throw new Error(`Server error (${response.status}): ${text.slice(0, 100) || response.statusText}`);
  }
}

export async function parseRecipe(payload: ParseRecipePayload): Promise<ParsedRecipeDraft> {
  const response = await fetch(`${API_BASE}/recipes/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'default-local-user',
    },
    body: JSON.stringify(payload),
  });
  return parseResponse<ParsedRecipeDraft>(response);
}
