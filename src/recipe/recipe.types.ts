/**
 * Branded type for integer values strictly greater than zero.
 * Used for servings, prep_time_minutes, and step_number.
 */
export type PositiveInteger = number & { readonly __brand: 'PositiveInteger' };

/**
 * Branded type for numeric values strictly greater than zero.
 * Used for ingredient amounts.
 */
export type PositiveNumber = number & { readonly __brand: 'PositiveNumber' };

/**
 * Allowed measurement units for an ingredient quantity.
 */
export type IngredientUnit = 'grams' | 'ml' | 'unit' | 'tbsp';

/**
 * A single ingredient required to prepare the recipe.
 */
export interface Ingredient {
  /** Ingredient name (e.g., "Potatoes"). */
  name: string;

  /** Quantity required. Must be > 0. */
  amount: PositiveNumber;

  /** Measurement unit. */
  unit: IngredientUnit;
}

/**
 * A single ordered step in the recipe preparation sequence.
 * step_number values must be sequential starting from 1 with no gaps or duplicates.
 */
export interface Step {
  /** Step sequence number (starting from 1). */
  step_number: PositiveInteger;

  /** Detailed instructions for this step. */
  instruction: string;
}

/**
 * Domain model for a recipe as defined by the creation payload attributes.
 */
export interface Recipe {
  /** Descriptive name of the recipe (e.g., "Spanish Omelette"). */
  title: string;

  /** A short summary or notes about the dish. */
  description?: string;

  /** Default number of servings. Must be > 0. */
  servings: PositiveInteger;

  /** Estimated preparation time in minutes. Must be > 0. */
  prep_time_minutes: PositiveInteger;

  /** Array of ingredients. Must contain at least 1 item. */
  ingredients: [Ingredient, ...Ingredient[]];

  /** Ordered sequence of preparation steps. Must contain at least 1 item. */
  steps: [Step, ...Step[]];
}

/**
 * DTO for submitting a new recipe creation request.
 * Mirrors the required and optional attributes from the creation payload.
 */
export interface CreateRecipeDto {
  title: string;
  description?: string;
  servings: PositiveInteger;
  prep_time_minutes: PositiveInteger;
  ingredients: [Ingredient, ...Ingredient[]];
  steps: [Step, ...Step[]];
}
