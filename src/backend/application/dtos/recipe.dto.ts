import { IngredientUnit } from '../../domain/entities/ingredient.entity.ts';

export interface CreateEquipmentDto {
  name: string;
  specification?: string;
  is_optional?: boolean;
}

export interface CreateIngredientDto {
  name: string;
  amount: number;
  unit: IngredientUnit;
}

export interface CreateStepDto {
  step_number: number;
  instruction: string;
}

export interface CreateRecipeDto {
  title: string;
  description?: string;
  servings: number;
  prep_time_minutes: number;
  equipment?: CreateEquipmentDto[];
  ingredients: CreateIngredientDto[];
  steps: CreateStepDto[];
}
