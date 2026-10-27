import { RecipeParserPort } from '../../application/ports/recipe-parser.port.ts';
import { ParsedRecipeDraftDto } from '../../application/dtos/parse-recipe.dto.ts';
import { GeminiRecipeParserAdapter } from './gemini-recipe-parser.adapter.ts';
import { OpenAiCompatibleRecipeParserAdapter } from './openai-compatible-recipe-parser.adapter.ts';
import { HeuristicRecipeParserAdapter } from './heuristic-recipe-parser.adapter.ts';

export class CompositeRecipeParserAdapter implements RecipeParserPort {
  private readonly heuristic: HeuristicRecipeParserAdapter;
  private readonly geminiParser: GeminiRecipeParserAdapter;
  private readonly openAiParser: OpenAiCompatibleRecipeParserAdapter;

  constructor(
    geminiParser: GeminiRecipeParserAdapter = new GeminiRecipeParserAdapter(),
    openAiParser: OpenAiCompatibleRecipeParserAdapter = new OpenAiCompatibleRecipeParserAdapter()
  ) {
    this.geminiParser = geminiParser;
    this.openAiParser = openAiParser;
    this.heuristic = new HeuristicRecipeParserAdapter();
  }

  public async parse(text: string): Promise<ParsedRecipeDraftDto> {
    if (process.env.GEMINI_API_KEY) {
      try {
        return await this.geminiParser.parse(text);
      } catch {
        // Fall through to the next provider.
      }
    }

    if (process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || process.env.LLM_BASE_URL) {
      try {
        return await this.openAiParser.parse(text);
      } catch {
        // Fall through to the local heuristic fallback.
      }
    }

    return this.heuristic.parse(text);
  }
}
