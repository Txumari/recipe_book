import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiRecipeParserAdapter } from '../infrastructure/parsers/gemini-recipe-parser.adapter.ts';
import { OpenAiCompatibleRecipeParserAdapter } from '../infrastructure/parsers/openai-compatible-recipe-parser.adapter.ts';
import { CompositeRecipeParserAdapter } from '../infrastructure/parsers/composite-recipe-parser.adapter.ts';
import { HttpContentExtractorAdapter } from '../infrastructure/parsers/http-content-extractor.adapter.ts';

describe('LLM Recipe Parsers, Composite Fallback & Content Extraction', () => {
  const geminiDraft = {
    title: 'Ramen de Miso',
    description: 'Spicy miso ramen',
    servings: 2,
    prep_time_minutes: 20,
    ingredients: [{ name: 'Fideos', amount: 2, unit: 'cups' }],
    steps: [{ step_number: 1, instruction: 'Boil noodles' }],
    parser_used: 'gemini',
  };

  const openAiDraft = {
    title: 'Garlic Pasta',
    servings: 4,
    prep_time_minutes: 15,
    ingredients: [{ name: 'Butter', amount: 2, unit: 'tbsp' }],
    steps: [{ step_number: 1, instruction: 'Melt butter' }],
    parser_used: 'openai-compatible',
  };

  beforeEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.LLM_BASE_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.LLM_BASE_URL;
  });

  it('GeminiRecipeParserAdapter parses a structured draft from the Gemini response', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    const adapter = new GeminiRecipeParserAdapter();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(geminiDraft) }] } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const draft = await adapter.parse('How to make ramen');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(draft.title).toBe('Ramen de Miso');
    expect(draft.parser_used).toBe('gemini');
  });

  it('OpenAiCompatibleRecipeParserAdapter parses a structured draft from the chat completion response', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const adapter = new OpenAiCompatibleRecipeParserAdapter();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(openAiDraft) } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const draft = await adapter.parse('How to make garlic pasta');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(draft.title).toBe('Garlic Pasta');
    expect(draft.parser_used).toBe('openai-compatible');
  });

  it('CompositeRecipeParserAdapter falls back to the heuristic parser when Gemini fails', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    const composite = new CompositeRecipeParserAdapter(
      new GeminiRecipeParserAdapter('test-gemini-key'),
      new OpenAiCompatibleRecipeParserAdapter('test-openai-key')
    );

    const fetchMock = vi.fn().mockRejectedValue(new Error('Gemini down'));
    vi.stubGlobal('fetch', fetchMock);

    const draft = await composite.parse('Caption text');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(draft.parser_used).toBe('heuristic');
  });

  it('CompositeRecipeParserAdapter returns the heuristic draft when no LLM provider is configured', async () => {
    const composite = new CompositeRecipeParserAdapter(
      new GeminiRecipeParserAdapter(),
      new OpenAiCompatibleRecipeParserAdapter()
    );

    const draft = await composite.parse('Caption text');

    expect(draft.parser_used).toBe('heuristic');
  });

  it('HttpContentExtractorAdapter extracts recipe text from OpenGraph metadata', async () => {
    const extractor = new HttpContentExtractorAdapter();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html><head><meta property="og:description" content="1 likes, 2 comments - user on May 5: &quot;Boil the noodles and add miso.&quot;" /></head></html>',
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await extractor.extract('https://instagram.com/p/ABC123', 5000);

    expect(result.text).toBe('Boil the noodles and add miso.');
  });

  it('HttpContentExtractorAdapter returns a warning instead of throwing when the URL is blocked', async () => {
    const extractor = new HttpContentExtractorAdapter();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    vi.stubGlobal('fetch', fetchMock);

    const result = await extractor.extract('https://instagram.com/p/ABC123', 5000);

    expect(result.text).toBeUndefined();
    expect(result.warning).toBeDefined();
  });
});
