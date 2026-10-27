export interface RecipeContentExtraction {
  text?: string;
  warning?: string;
}

export interface ContentExtractorPort {
  /**
   * Best-effort extraction of recipe text from a URL (e.g. OpenGraph / meta / JSON-LD).
   * Never throws for blocked or empty responses; returns a warning instead when no text is found.
   */
  extract(url: string, timeoutMs?: number): Promise<RecipeContentExtraction>;
}
