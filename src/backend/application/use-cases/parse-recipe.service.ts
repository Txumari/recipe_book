import { InvalidRecipePayloadError } from '../../domain/errors/recipe-domain.error.ts';
import { RecipeParserPort } from '../ports/recipe-parser.port.ts';
import { ContentExtractorPort, RecipeContentExtraction } from '../ports/content-extractor.port.ts';
import { ParseRecipeRequestDto, ParsedRecipeDraftDto } from '../dtos/parse-recipe.dto.ts';

const DEFAULT_CONTENT_EXTRACTION_TIMEOUT_MS = 5000;

export class ParseRecipeService {
  constructor(
    private readonly parser: RecipeParserPort,
    private readonly contentExtractor?: ContentExtractorPort
  ) {}

  public async execute(request: ParseRecipeRequestDto): Promise<ParsedRecipeDraftDto> {
    const url = request.url?.trim() || undefined;
    const text = request.text?.trim() || undefined;

    if (!url && !text) {
      throw new InvalidRecipePayloadError('A recipe URL or text is required to parse a recipe.');
    }

    // Direct text parse: use the provided recipe text and keep the URL as source attribution.
    if (text) {
      const draft = await this.parser.parse(text);
      return { ...draft, source_url: url ?? draft.source_url };
    }

    // URL-only flow: best-effort content extraction, then parse or degrade gracefully.
    const extraction: RecipeContentExtraction | undefined = await this.contentExtractor?.extract(url!, DEFAULT_CONTENT_EXTRACTION_TIMEOUT_MS);
    const sourceText = extraction?.text?.trim();

    if (sourceText) {
      const draft = await this.parser.parse(sourceText);
      return { ...draft, source_url: url };
    }

    // Graceful degradation: keep source_url, warn that text must be pasted manually.
    return {
      source_url: url,
      parser_used: 'heuristic',
      extraction_warning:
        'No recipe text could be automatically fetched from the provided URL. Please paste the caption or comment text into the recipe import field.',
    };
  }
}
