import { CreateEquipmentDto, CreateIngredientDto, CreateStepDto } from './recipe.dto.ts';

/**
 * Identifies which parser produced (or fell back to) a parsed recipe draft.
 */
export type ParsedRecipeSourceType = 'gemini' | 'openai-compatible' | 'heuristic';

/**
 * Request payload for the recipe parsing endpoint.
 * Accepts an Instagram URL, raw recipe text, or both.
 */
export interface ParseRecipeRequestDto {
  url?: string;
  text?: string;
}

/**
 * Structured recipe draft returned by the parser, before user review/saving.
 * Mirrors the creation attributes plus parser metadata and optional extraction warnings.
 */
export interface ParsedRecipeDraftDto {
  title?: string;
  description?: string;
  source_url?: string;
  servings?: number;
  prep_time_minutes?: number;
  equipment?: CreateEquipmentDto[];
  ingredients?: CreateIngredientDto[];
  steps?: CreateStepDto[];
  parser_used: ParsedRecipeSourceType;
  extraction_warning?: string;
}
