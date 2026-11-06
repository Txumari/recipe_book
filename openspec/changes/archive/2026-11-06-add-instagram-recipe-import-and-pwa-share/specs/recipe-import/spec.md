# Spec Delta

## Purpose

Allows users to import and parse recipes from shared URLs (such as Instagram posts/reels) or unstructured text captions and comments into structured recipe drafts ready for review and saving, including native mobile sharing via Progressive Web App (PWA) Share Target integration.

## ADDED Requirements

### Requirement: Recipe Parsing Endpoint
The system SHALL expose an HTTP endpoint (`POST /api/recipes/parse`) that accepts an object containing `url`, `text`, or both, and returns a structured recipe draft matching the recipe creation schema.

#### Scenario: Parsing raw recipe text into structured draft
- **WHEN** a client sends a `POST /api/recipes/parse` request with unstructured recipe text containing ingredients and preparation instructions
- **THEN** the system MUST return HTTP 200 with a structured draft containing `title`, positive `servings`, positive `prep_time_minutes`, valid `ingredients` mapped to supported measurement units, and sequential 1-indexed `steps`.

#### Scenario: Rejecting empty parse request
- **WHEN** a client sends a `POST /api/recipes/parse` request where both `url` and `text` are missing or whitespace-only
- **THEN** the system MUST return HTTP 400 Bad Request with an error message indicating that a URL or recipe text is required.

### Requirement: Source URL Metadata Extraction and Graceful Degradation
When a `url` is provided to `POST /api/recipes/parse` without explicit `text`, the system SHALL attempt to extract the post description or caption metadata from the URL and preserve the `url` as `source_url` in the returned draft even if remote extraction is blocked.

#### Scenario: Extracting caption from a public post URL
- **WHEN** a client sends a `POST /api/recipes/parse` request with a public URL whose metadata contains a recipe description
- **THEN** the system MUST extract the description text, parse it into a structured recipe draft, and include the original URL in `source_url`.

#### Scenario: Graceful fallback when URL scraping is blocked or empty
- **WHEN** a client sends a `POST /api/recipes/parse` request with a URL that blocks automated fetching or contains no recipe text in its metadata
- **THEN** the system MUST return a response preserving `source_url` and indicating that caption text could not be fetched automatically so the user can paste the caption or comment text manually.

### Requirement: Multi-Provider LLM Parsing with Local Rule-Based Fallback
The system SHALL support configuring multiple LLM providers (including Google Gemini and OpenAI-compatible endpoints such as OpenAI, Groq, or Ollama) via environment variables to parse unstructured recipe text, and MUST automatically fall back to a deterministic local rule-based parser when no LLM credentials are configured or when provider requests fail.

#### Scenario: Parsing via configured LLM provider
- **WHEN** an LLM provider API key is configured and `POST /api/recipes/parse` is called with unstructured recipe text
- **THEN** the system MUST invoke the configured LLM provider to extract structured recipe fields and normalize ingredient units to the allowed domain taxonomy.

#### Scenario: Automatic fallback to local rule-based parser
- **WHEN** no LLM API keys are configured or all configured LLM providers return an error or timeout
- **THEN** the system MUST parse the recipe text using the local rule-based heuristic parser and return a valid structured recipe draft without failing the request.

### Requirement: Interactive Import Pre-Fill in Recipe Form
The frontend recipe creation view (`RecipeForm`) SHALL provide an import interface allowing users to paste a source URL and/or raw recipe text, trigger parsing, and populate all form fields (`title`, `description`, `source_url`, `servings`, `prep_time_minutes`, `equipment`, `ingredients`, `steps`) for user review before saving.

#### Scenario: Pre-filling the recipe form from pasted text and URL
- **WHEN** a user enters an Instagram URL and/or raw recipe text in the import panel and clicks the parse button
- **THEN** the form inputs MUST be populated with the parsed recipe draft so the user can review, adjust any field, and submit the form to save the recipe.

### Requirement: PWA Web Share Target and URL Query Import
The frontend application SHALL provide a Web App Manifest (`manifest.webmanifest`) with a `share_target` definition and handle `?shareUrl` and `?shareText` URL query parameters by opening the recipe creation view and initiating the import flow automatically.

#### Scenario: Opening app via mobile share target query parameters
- **WHEN** a user navigates to the application with `?shareUrl=` or `?shareText=` in the query string (such as from the Android Share Sheet or an iOS Shortcut)
- **THEN** the application MUST switch directly to the recipe creation view, populate the shared URL or text into the import flow, and trigger recipe parsing.
