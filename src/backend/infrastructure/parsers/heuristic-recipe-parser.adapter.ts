import { RecipeParserPort } from '../../application/ports/recipe-parser.port.ts';
import { ParsedRecipeDraftDto, ParsedRecipeSourceType } from '../../application/dtos/parse-recipe.dto.ts';
import { VALID_INGREDIENT_UNITS, IngredientUnit } from '../../domain/entities/ingredient.entity.ts';

type HeuristicSection = 'title' | 'ingredients' | 'steps' | 'equipment';

interface HeuristicIngredient {
  name: string;
  amount: number;
  unit: IngredientUnit;
}

interface HeuristicStep {
  instruction: string;
}

interface HeuristicEquipment {
  name: string;
  specification?: string;
  is_optional?: boolean;
}

const DEFAULT_SERVINGS = 2;
const DEFAULT_PREP_TIME_MINUTES = 20;

const UNIT_SYNONYMS: Record<string, IngredientUnit> = {
  g: 'grams',
  gram: 'grams',
  gramo: 'grams',
  gramos: 'grams',
  kg: 'kg',
  kilogramo: 'kg',
  kilogramos: 'kg',
  kgs: 'kg',
  ml: 'ml',
  mililitro: 'ml',
  mililitros: 'ml',
  milliliters: 'ml',
  l: 'l',
  litro: 'l',
  litros: 'l',
  liter: 'l',
  tbsp: 'tbsp',
  tbsps: 'tbsp',
  cda: 'tbsp',
  cucharada: 'tbsp',
  cucharadas: 'tbsp',
  cucharon: 'tbsp',
  tsp: 'tsp',
  cdta: 'tsp',
  cucharadita: 'tsp',
  cucharaditas: 'tsp',
  cup: 'cup',
  taza: 'cup',
  tazas: 'cup',
  cups: 'cup',
  pinch: 'pinch',
  pizca: 'pinch',
  gusto: 'pinch',
  clove: 'clove',
  diente: 'clove',
  dientes: 'clove',
  splash: 'splash',
  chorrito: 'splash',
  chorros: 'splash',
  slice: 'slice',
  rodaja: 'slice',
  rodajas: 'slice',
  unit: 'unit',
  unidad: 'unit',
  unidades: 'unit',
  un: 'unit',
};

const INGREDIENTS_HEADER = /ingredientes|ingredients/i;
const STEPS_HEADER = /pasos|preparaci[oó]n|preparacion|instrucciones|instructions|steps/i;
const EQUIPMENT_HEADER = /equipamiento|equipment|equipos|utensilios|tools/i;

export class HeuristicRecipeParserAdapter implements RecipeParserPort {
  public async parse(text: string): Promise<ParsedRecipeDraftDto> {
    const lines = this.normalizeLines(text);
    const draft = this.parseLines(lines);

    return {
      ...draft,
      parser_used: 'heuristic' as ParsedRecipeSourceType,
    };
  }

  private normalizeLines(text: string): string[] {
    return text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  private parseLines(lines: string[]): Omit<ParsedRecipeDraftDto, 'parser_used'> {
    let section: HeuristicSection = 'title';
    let title: string | undefined;
    let servings: number | undefined;
    let prepTimeMinutes: number | undefined;
    const ingredients: HeuristicIngredient[] = [];
    const steps: HeuristicStep[] = [];
    const equipmentList: HeuristicEquipment[] = [];

    for (const rawLine of lines) {
      const line = this.stripListMarkers(rawLine);
      if (!line) continue;

      const lower = line.toLowerCase();

      const servingsMatch = line.match(/(?:para|serves|servings?|personas?)\s*(?:de|of|:)?\s*(\d+(?:\.\d+)?)/i);
      if (servingsMatch) { servings = Number(servingsMatch[1]); continue; }

      const prepTimeMatch = line.match(
        /tiempo\s*(?:de\s*)?preparaci[oó]n\s*:?\s*(\d+(?:\.\d+)?)|prep(?:time)?\s*:?\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:minutos?|mins?|minutes?|min)\b/i
      );
      if (prepTimeMatch) {
        prepTimeMinutes = Number(prepTimeMatch[1] ?? prepTimeMatch[2] ?? prepTimeMatch[3]);
        continue;
      }

      if (EQUIPMENT_HEADER.test(lower)) { section = 'equipment'; continue; }
      if (STEPS_HEADER.test(lower)) { section = 'steps'; continue; }
      if (INGREDIENTS_HEADER.test(lower)) { section = 'ingredients'; continue; }

      switch (section) {
        case 'title':
          if (!title) title = line;
          break;
        case 'ingredients': {
          const ingredient = this.parseIngredientLine(line);
          if (ingredient) ingredients.push(ingredient);
          break;
        }
        case 'steps':
          steps.push({ instruction: line });
          break;
        case 'equipment': {
          const name = line.replace(/^\d+[.)]?\s*/, '').trim();
          if (name) equipmentList.push({ name });
          break;
        }
      }
    }

    return {
      title: title ?? 'Imported Recipe',
      description: undefined,
      source_url: undefined,
      servings: servings ?? DEFAULT_SERVINGS,
      prep_time_minutes: prepTimeMinutes ?? DEFAULT_PREP_TIME_MINUTES,
      equipment: equipmentList.length > 0
        ? equipmentList.map(e => ({ name: e.name, specification: e.specification, is_optional: e.is_optional }))
        : undefined,
      ingredients: ingredients.map(i => ({ name: i.name, amount: i.amount, unit: i.unit })),
      steps: steps.map((s, idx) => ({ step_number: idx + 1, instruction: s.instruction })),
    };
  }

  private stripListMarkers(line: string): string {
    return line
      .replace(/^\s*\d+[.)]\s+/, '')
      .replace(/^[-*•]\s+/, '')
      .trim();
  }

  private parseIngredientLine(line: string): HeuristicIngredient | null {
    const match = line.match(/^(\d+(?:[.,]\d+)?(?:\/\d+)?)\s+(.+)$/);
    if (!match) return null;

    const rawAmount = match[1].replace(',', '.');
    const amount = rawAmount.includes('/') ? Number(rawAmount.split('/')[0]) / Number(rawAmount.split('/')[1]) : Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const rest = match[2];
    const tokens = rest.trim().split(/\s+/);
    const unitIndex = tokens.findIndex(t => UNIT_SYNONYMS[t.toLowerCase()] !== undefined);
    const unit = unitIndex >= 0 ? UNIT_SYNONYMS[tokens[unitIndex].toLowerCase()] : 'unit';
    const nameTokens = unitIndex >= 0 ? tokens.slice(unitIndex + 1) : tokens;
    while (nameTokens.length > 0 && ['de', 'of', 'y'].includes(nameTokens[0].toLowerCase())) {
      nameTokens.shift();
    }
    const name = nameTokens.join(' ').trim();

    if (!name) return null;
    if (!VALID_INGREDIENT_UNITS.includes(unit)) return null;

    return { name, amount, unit };
  }
}
