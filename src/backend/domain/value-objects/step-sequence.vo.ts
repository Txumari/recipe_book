import { InvalidRecipePayloadError } from '../errors/recipe-domain.error.ts';
import { Step } from '../entities/step.entity.ts';

export function validateStepSequence(steps: Step[]): void {
  if (!steps || steps.length === 0) {
    throw new InvalidRecipePayloadError('A recipe must contain at least one ingredient and one step.');
  }

  const sortedSteps = [...steps].sort((a, b) => a.step_number - b.step_number);

  for (let i = 0; i < sortedSteps.length; i++) {
    const expectedStepNumber = i + 1;
    if (sortedSteps[i].step_number !== expectedStepNumber) {
      throw new InvalidRecipePayloadError('Step numbers must be sequential starting from 1.');
    }
  }
}
