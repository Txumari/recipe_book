import { ParsedRecipeDraftDto } from '../dtos/parse-recipe.dto.ts';

export interface RecipeParserPort {
  /**
   * Parses unstructured recipe text (e.g. an Instagram caption) into a structured recipe draft.
   * Implementations should fall back internally when no provider is configured or a provider fails.
   */
  parse(text: string): Promise<ParsedRecipeDraftDto>;
}
