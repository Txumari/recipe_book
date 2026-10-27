import { RecipeParserPort } from '../../application/ports/recipe-parser.port.ts';
import { ParsedRecipeDraftDto } from '../../application/dtos/parse-recipe.dto.ts';

export class GeminiRecipeParserAdapter implements RecipeParserPort {
  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor(apiKey: string = process.env.GEMINI_API_KEY || '', model: string = process.env.GEMINI_MODEL || 'gemini-2.0-flash') {
    this.apiKey = apiKey || undefined;
    this.model = model;
  }

  public async parse(text: string): Promise<ParsedRecipeDraftDto> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured.');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                servings: { type: 'number' },
                prep_time_minutes: { type: 'number' },
                ingredients: { type: 'array', items: { type: 'object' } },
                steps: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API request failed with status ${response.status}.`);
    }

    const data = (await response.json()) as any;
    const part = data?.candidates?.[0]?.content?.parts?.[0];
    const content = part?.text;
    if (!content) {
      throw new Error('Gemini returned an empty response.');
    }

    return JSON.parse(content) as ParsedRecipeDraftDto;
  }
}
