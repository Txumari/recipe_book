import { PositiveInteger, parsePositiveInteger } from '../value-objects/positive-number.vo.ts';
import { validateStepSequence } from '../value-objects/step-sequence.vo.ts';
import { Ingredient, IngredientProps } from './ingredient.entity.ts';
import { Step, StepProps } from './step.entity.ts';
import { Equipment, EquipmentProps } from './equipment.entity.ts';
import { InvalidRecipePayloadError } from '../errors/recipe-domain.error.ts';

export interface RecipeProps {
  id?: string;
  userId?: string;
  title: string;
  description?: string;
  servings: number;
  prep_time_minutes: number;
  equipment?: EquipmentProps[];
  ingredients: IngredientProps[];
  steps: StepProps[];
  createdAt?: string;
}

export class Recipe {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly description?: string;
  readonly servings: PositiveInteger;
  readonly prep_time_minutes: PositiveInteger;
  readonly equipment: Equipment[];
  readonly ingredients: Ingredient[];
  readonly steps: Step[];
  readonly createdAt: string;

  private constructor(
    id: string,
    userId: string,
    title: string,
    description: string | undefined,
    servings: PositiveInteger,
    prep_time_minutes: PositiveInteger,
    equipment: Equipment[],
    ingredients: Ingredient[],
    steps: Step[],
    createdAt: string
  ) {
    this.id = id;
    this.userId = userId;
    this.title = title;
    this.description = description;
    this.servings = servings;
    this.prep_time_minutes = prep_time_minutes;
    this.equipment = equipment;
    this.ingredients = ingredients;
    this.steps = steps;
    this.createdAt = createdAt;
  }

  public static create(props: RecipeProps): Recipe {
    if (!props.title || props.title.trim().length === 0) {
      throw new InvalidRecipePayloadError('Recipe title cannot be empty.');
    }

    if (!props.ingredients || props.ingredients.length === 0 || !props.steps || props.steps.length === 0) {
      throw new InvalidRecipePayloadError('A recipe must contain at least one ingredient and one step.');
    }

    const servings = parsePositiveInteger(props.servings, 'Servings');
    const prep_time_minutes = parsePositiveInteger(props.prep_time_minutes, 'Prep time');

    const equipment = (props.equipment || []).map(e => Equipment.create(e));
    const ingredients = props.ingredients.map(i => Ingredient.create(i));
    const steps = props.steps.map(s => Step.create(s));

    validateStepSequence(steps);

    const id = props.id || `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userId = props.userId || 'default-local-user';
    const createdAt = props.createdAt || new Date().toISOString();

    return new Recipe(
      id,
      userId,
      props.title.trim(),
      props.description?.trim(),
      servings,
      prep_time_minutes,
      equipment,
      ingredients,
      steps,
      createdAt
    );
  }
}
