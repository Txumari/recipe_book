import { PositiveInteger, parsePositiveInteger } from '../value-objects/positive-number.vo.ts';
import { InvalidRecipePayloadError } from '../errors/recipe-domain.error.ts';

export interface StepProps {
  step_number: number;
  instruction: string;
}

export class Step {
  readonly step_number: PositiveInteger;
  readonly instruction: string;

  private constructor(step_number: PositiveInteger, instruction: string) {
    this.step_number = step_number;
    this.instruction = instruction;
  }

  public static create(props: StepProps): Step {
    if (!props.instruction || props.instruction.trim().length === 0) {
      throw new InvalidRecipePayloadError('Step instruction cannot be empty.');
    }
    const stepNumber = parsePositiveInteger(props.step_number, 'Step number');
    return new Step(stepNumber, props.instruction.trim());
  }
}
