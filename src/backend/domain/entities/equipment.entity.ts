import { InvalidRecipePayloadError } from '../errors/recipe-domain.error.ts';

export interface EquipmentProps {
  name: string;
  specification?: string;
  is_optional?: boolean;
}

export class Equipment {
  readonly name: string;
  readonly specification?: string;
  readonly is_optional: boolean;

  private constructor(name: string, specification?: string, is_optional: boolean = false) {
    this.name = name;
    this.specification = specification;
    this.is_optional = is_optional;
  }

  public static create(props: EquipmentProps): Equipment {
    if (!props.name || props.name.trim().length === 0) {
      throw new InvalidRecipePayloadError('Equipment name cannot be empty.');
    }
    return new Equipment(
      props.name.trim(),
      props.specification?.trim() || undefined,
      !!props.is_optional
    );
  }
}
