import { RecipeDomainError } from './recipe-domain.error.ts';

/** Base class of weekly menu business errors (AGENTS.md R4: every domain error is a RecipeDomainError). */
export abstract class MenuDomainError extends RecipeDomainError {}

/** The menu payload breaks a structural rule (week start, day/slot, note, duplicates). */
export class InvalidMenuPayloadError extends MenuDomainError {
  constructor(message: string) {
    super(message);
  }
}

/** A meal entry references a recipe that does not exist for the user. */
export class UnknownMenuRecipeError extends MenuDomainError {
  readonly recipeId: string;

  constructor(recipeId: string) {
    super(`Unknown recipe ID "${recipeId}". Use list_recipes to get valid recipe IDs for this user.`);
    this.recipeId = recipeId;
  }
}

export class MenuNotFoundError extends MenuDomainError {
  readonly weekStart: string;

  constructor(weekStart: string) {
    super(`No weekly menu exists for the week starting ${weekStart}.`);
    this.weekStart = weekStart;
  }
}
