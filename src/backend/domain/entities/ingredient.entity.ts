import { PositiveNumber, parsePositiveNumber } from '../value-objects/positive-number.vo.ts';
import { InvalidRecipePayloadError } from '../errors/recipe-domain.error.ts';

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

export const VALID_INGREDIENT_UNITS: readonly IngredientUnit[] = [
  'grams',
  'kg',
  'ml',
  'l',
  'tbsp',
  'tsp',
  'cup',
  'pinch',
  'unit',
  'clove',
  'slice',
  'splash',
];

export interface IngredientProps {
  name: string;
  amount: number;
  unit: IngredientUnit;
}

export class Ingredient {
  readonly name: string;
  readonly amount: PositiveNumber;
  readonly unit: IngredientUnit;

  private constructor(name: string, amount: PositiveNumber, unit: IngredientUnit) {
    this.name = name;
    this.amount = amount;
    this.unit = unit;
  }

  public static create(props: IngredientProps): Ingredient {
    if (!props.name || props.name.trim().length === 0) {
      throw new InvalidRecipePayloadError('Ingredient name cannot be empty.');
    }

    if (!VALID_INGREDIENT_UNITS.includes(props.unit)) {
      throw new InvalidRecipePayloadError(
        `Invalid ingredient unit "${props.unit}". Allowed units: ${VALID_INGREDIENT_UNITS.join(', ')}`
      );
    }

    const amount = parsePositiveNumber(props.amount, `Ingredient "${props.name}" amount`);
    return new Ingredient(props.name.trim(), amount, props.unit);
  }
}
