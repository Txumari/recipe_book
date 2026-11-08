import { RecipeParserPort } from '../../application/ports/recipe-parser.port.ts';
import { ParsedRecipeDraftDto } from '../../application/dtos/parse-recipe.dto.ts';

export class OpenAiCompatibleRecipeParserAdapter implements RecipeParserPort {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    baseUrl: string = process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    apiKey: string = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || '',
    model: string = process.env.LLM_MODEL || 'gpt-4o-mini'
  ) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
  }

  public async parse(text: string): Promise<ParsedRecipeDraftDto> {
    if (!this.apiKey) {
      throw new Error('OpenAI-compatible API key is not configured.');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: `Parse this recipe into a structured draft: ${text}` }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI-compatible API request failed with status ${response.status}.`);
    }

    const data = (await response.json()) as any;
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI-compatible provider returned an empty response.');
    }

    return JSON.parse(content) as ParsedRecipeDraftDto;
  }
}
