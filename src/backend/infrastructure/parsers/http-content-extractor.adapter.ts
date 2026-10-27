import { ContentExtractorPort, RecipeContentExtraction } from '../../application/ports/content-extractor.port.ts';

export class HttpContentExtractorAdapter implements ContentExtractorPort {
  public async extract(url: string, timeoutMs: number = 5000): Promise<RecipeContentExtraction> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
      if (!response.ok) {
        return { warning: `Failed to fetch URL content (HTTP ${response.status}).` };
      }
      const html = await response.text();
      const text = this.extractRecipeText(html);
      if (!text) {
        return { warning: 'No recipe text could be found in the fetched URL content.' };
      }
      return { text };
    } catch {
      return { warning: 'Failed to fetch URL content.' };
    } finally {
      clearTimeout(timer);
    }
  }

  private extractRecipeText(html: string): string | undefined {
    const ogMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const jsonLdMatch = html.match(/"articleBody"\s*:\s*"((?:[^"\\]|\\.)*)"/i) || html.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/i);

    const raw = ogMatch?.[1] ?? metaMatch?.[1] ?? (jsonLdMatch ? this.decodeJsonString(jsonLdMatch[1]) : undefined);
    if (!raw) return undefined;

    let text = this.decodeHtmlEntities(raw).trim();
    const colonIndex = text.indexOf(': "');
    if (colonIndex >= 0) {
      text = text.slice(colonIndex + 2);
    }
    text = text.replace(/^["']|["']$/g, '').trim();
    return text || undefined;
  }

  private decodeJsonString(raw: string): string {
    try {
      return JSON.parse(`"${raw}"`) as string;
    } catch {
      return raw.replace(/\\(.)/g, '$1');
    }
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }
}
