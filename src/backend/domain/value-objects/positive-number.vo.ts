import { InvalidRecipePayloadError } from '../errors/recipe-domain.error.ts';

export type PositiveInteger = number & { readonly __brand: 'PositiveInteger' };
export type PositiveNumber = number & { readonly __brand: 'PositiveNumber' };

export function parsePositiveInteger(value: unknown, fieldName: string): PositiveInteger {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new InvalidRecipePayloadError(
      `Servings and prep time must be greater than zero.`
    );
  }
  return value as PositiveInteger;
}

export function parsePositiveNumber(value: unknown, fieldName: string): PositiveNumber {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    throw new InvalidRecipePayloadError(
      `${fieldName} must be a number greater than zero.`
    );
  }
  return value as PositiveNumber;
}
