export abstract class RecipeDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidRecipePayloadError extends RecipeDomainError {
  constructor(message: string) {
    super(message);
  }
}

export class DuplicateRecipeTitleError extends RecipeDomainError {
  constructor(title: string) {
    super(`A recipe with this title already exists.`);
  }
}
