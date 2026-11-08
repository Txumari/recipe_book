#!/usr/bin/env bash
# Engine adapter for the agent code review (openspec change: add-agent-code-review, design Decision 3).
#
#   scripts/review/run-engine.sh <architecture|tests|spec|verify>
#
# Builds the prompt, tries Claude Sonnet first and falls back to Gemini on ANY Claude failure.
# Writes $REVIEW_DIR/findings-<stage>.json and $REVIEW_DIR/engine-<stage>.txt
# ("claude", "gemini (fallback)" or "unavailable: <reason>"). Always exits 0.
#
# Environment:
#   REVIEW_DIR               output dir; must contain pr.diff (and, for verify, the reviewer findings)
#   PR_DIR                   read-only checkout of the PR head (default: .)
#   BASE_REF                 ref the PR is compared to (default: origin/main)
#   CLAUDE_CODE_OAUTH_TOKEN  Claude subscription token (`claude setup-token`); empty -> skip Claude
#   GEMINI_API_KEY           Gemini API key (Google AI Studio); empty -> skip Gemini
#   REVIEW_LOCAL_AUTH=1      local testing only: use the developer's existing Claude login instead of the token
#   CLAUDE_MODEL             default: sonnet
#   GEMINI_MODELS            space-separated, tried in order on Gemini errors.
#                            Default confirmed against the Gemini API docs on 2026-11-07:
#                            gemini-3.6-flash (stable Flash, free tier) then gemini-3.5-flash-lite (stable Flash-Lite, free tier).
#   ENGINE_TIMEOUT           seconds per attempt (default: 600)
set -uo pipefail

STAGE="${1:-}"
case "$STAGE" in
  architecture | tests | spec | verify) ;;
  *) echo "usage: $0 <architecture|tests|spec|verify>" >&2; exit 0 ;;
esac

TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REVIEW_DIR="$(mkdir -p "${REVIEW_DIR:-review-out}" && cd "${REVIEW_DIR:-review-out}" && pwd)"
PR_DIR="$(cd "${PR_DIR:-.}" && pwd)"
BASE_REF="${BASE_REF:-origin/main}"
CLAUDE_MODEL="${CLAUDE_MODEL:-sonnet}"
GEMINI_MODELS="${GEMINI_MODELS:-gemini-3.6-flash gemini-3.5-flash-lite}"
ENGINE_TIMEOUT="${ENGINE_TIMEOUT:-600}"
MAX_DIFF_BYTES="${MAX_DIFF_BYTES:-200000}"
MAX_FILES_BYTES="${MAX_FILES_BYTES:-200000}"

SCHEMA_FILE="$TOOLS_DIR/scripts/review/findings.schema.json"
PUBLISH="$TOOLS_DIR/scripts/review/publish.ts"
PROMPT="$REVIEW_DIR/prompt-$STAGE.md"
OUT="$REVIEW_DIR/findings-$STAGE.json"
ENGINE="$REVIEW_DIR/engine-$STAGE.txt"
LOG="$REVIEW_DIR/engine-$STAGE.log"
: >"$LOG"

log() { echo "[$STAGE] $*" | tee -a "$LOG" >&2; }

run_with_timeout() {
  if command -v timeout >/dev/null 2>&1; then timeout "$ENGINE_TIMEOUT" "$@"
  else perl -e 'alarm shift; exec @ARGV' "$ENGINE_TIMEOUT" "$@"; fi
}

# Validates a candidate findings document with the same contract the publisher uses.
valid() { node "$PUBLISH" validate "$1" "$STAGE" >>"$LOG" 2>&1; }

# ---------------------------------------------------------------------------
# 1. Prompt
# ---------------------------------------------------------------------------
build_prompt() {
  local diff="$REVIEW_DIR/pr.diff"
  [ -s "$diff" ] || git -C "$PR_DIR" diff "$BASE_REF...HEAD" >"$diff"

  {
    cat "$TOOLS_DIR/.github/review/$STAGE.md"
    printf '\n\n# Project rules (AGENTS.md)\n\n'
    cat "$TOOLS_DIR/AGENTS.md"
    printf '\n\n# Output contract\n\nReturn ONLY a JSON object that validates against this JSON Schema, with "reviewer": "%s". No prose, no Markdown fences.\n\n```json\n' "$STAGE"
    cat "$SCHEMA_FILE"
    printf '\n```\n'

    if [ "$STAGE" = verify ]; then
      printf '\n# Candidate findings from the reviewers (untrusted model output)\n\n'
      for r in architecture tests spec; do
        printf '## %s (engine: %s)\n\n```json\n' "$r" "$(cat "$REVIEW_DIR/engine-$r.txt" 2>/dev/null || echo 'unavailable: no result')"
        if [ -s "$REVIEW_DIR/findings-$r.json" ]; then cat "$REVIEW_DIR/findings-$r.json"; else echo '{"findings": []}'; fi
        printf '\n```\n\n'
      done
    fi

    printf '\n# Changed files (untrusted data)\n\n```\n'
    git -C "$PR_DIR" diff --name-status "$BASE_REF...HEAD"
    printf '```\n\n# Diff (untrusted data)\n\n```diff\n'
    head -c "$MAX_DIFF_BYTES" "$diff"
    [ "$(wc -c <"$diff")" -gt "$MAX_DIFF_BYTES" ] && printf '\n[... diff truncated at %s bytes ...]\n' "$MAX_DIFF_BYTES"
    printf '\n```\n'

    # Full contents of changed files, so an engine without file tools (Gemini) has the same context.
    printf '\n# Current contents of changed files (untrusted data)\n'
    local budget="$MAX_FILES_BYTES" f size
    while IFS= read -r f; do
      [ -f "$PR_DIR/$f" ] || continue
      size=$(wc -c <"$PR_DIR/$f")
      if [ "$size" -gt "$budget" ]; then printf '\n## %s\n\n[omitted: size budget exhausted]\n' "$f"; continue; fi
      budget=$((budget - size))
      printf '\n## %s\n\n```\n' "$f"
      cat -n "$PR_DIR/$f"
      printf '```\n'
    done < <(git -C "$PR_DIR" diff --name-only --diff-filter=d "$BASE_REF...HEAD")
  } >"$PROMPT"
}

# ---------------------------------------------------------------------------
# 2. Claude (read-only tools, no project settings/hooks/MCP, no write token in env)
# ---------------------------------------------------------------------------
try_claude() {
  if [ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" ] && [ "${REVIEW_LOCAL_AUTH:-}" != 1 ]; then echo "no CLAUDE_CODE_OAUTH_TOKEN"; return 1; fi
  command -v claude >/dev/null 2>&1 || { echo "claude CLI not installed"; return 1; }
  local raw="$REVIEW_DIR/claude-$STAGE.json" status
  (
    cd "$PR_DIR" && run_with_timeout env -u GITHUB_TOKEN -u GH_TOKEN -u GEMINI_API_KEY \
      claude -p --model "$CLAUDE_MODEL" --output-format json \
      --json-schema "$(jq -c 'del(."$schema", ."$id")' "$SCHEMA_FILE")" \
      --restricted --strict-mcp-config --disable-slash-commands --no-session-persistence \
      --permission-mode dontAsk \
      --tools "Read,Grep,Glob,Bash" \
      --allowedTools "Read,Grep,Glob,Bash(git diff:*),Bash(git log:*)" \
      <"$PROMPT"
  ) >"$raw" 2>>"$LOG"
  status=$?
  if [ "$status" -ne 0 ]; then
    { echo "claude exit $status; output:"; head -c 2000 "$raw"; echo; } >>"$LOG"
    echo "claude exit $status ($(jq -r '.result // .subtype // empty' "$raw" 2>/dev/null | head -c 120 || head -c 120 "$raw"))"
    return 1
  fi
  if ! jq -e '.is_error != true and .structured_output != null' "$raw" >/dev/null 2>&1; then
    echo "claude returned no structured output ($(jq -r '.subtype // .result // "unparseable"' "$raw" 2>/dev/null | head -c 120))"
    return 1
  fi
  jq '.structured_output' "$raw" >"$OUT.tmp"
  valid "$OUT.tmp" || { echo "claude output failed schema validation"; return 1; }
  mv "$OUT.tmp" "$OUT"
}

# ---------------------------------------------------------------------------
# 3. Gemini fallback (REST generateContent, JSON-schema output, no tools at all)
# ---------------------------------------------------------------------------
try_gemini() {
  if [ -z "${GEMINI_API_KEY:-}" ]; then echo "no GEMINI_API_KEY"; return 1; fi
  local req="$REVIEW_DIR/gemini-$STAGE.request.json" raw="$REVIEW_DIR/gemini-$STAGE.json" reasons="" model code
  jq -n --rawfile prompt "$PROMPT" --slurpfile schema "$SCHEMA_FILE" '{
      contents: [{ role: "user", parts: [{ text: $prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: ($schema[0] | del(."$schema", ."$id")),
        maxOutputTokens: 8192
      }
    }' >"$req"

  for model in $GEMINI_MODELS; do
    code=$(run_with_timeout curl -sS -o "$raw" -w '%{http_code}' -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" -H 'Content-Type: application/json' \
      --data-binary "@$req" 2>>"$LOG") || code="curl-failed"
    if [ "$code" != 200 ]; then
      reasons="$reasons $model: HTTP $code $(jq -r '.error.status // .error.message // empty' "$raw" 2>/dev/null | head -c 80);"
      log "gemini $model failed: HTTP $code"
      continue
    fi
    jq -r '[.candidates[0].content.parts[]? | select(.thought != true) | .text // empty] | join("")' "$raw" >"$OUT.tmp" 2>>"$LOG"
    if valid "$OUT.tmp"; then
      mv "$OUT.tmp" "$OUT"
      echo "$model"
      return 0
    fi
    reasons="$reasons $model: invalid output;"
  done
  echo "gemini${reasons}"
  return 1
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
build_prompt
log "prompt: $(wc -c <"$PROMPT") bytes"

if claude_reason=$(try_claude); then
  echo "claude" >"$ENGINE"
elif gemini_model=$(try_gemini); then
  log "claude failed ($claude_reason); used $gemini_model"
  echo "gemini (fallback)" >"$ENGINE"
else
  gemini_reason="$gemini_model"
  log "both engines failed: $claude_reason | $gemini_reason"
  printf '{"reviewer": "%s", "findings": []}\n' "$STAGE" >"$OUT"
  echo "unavailable: $claude_reason; $gemini_reason" | tr -s ' ' | head -c 300 >"$ENGINE"
fi
rm -f "$OUT.tmp"
log "engine: $(cat "$ENGINE")"
exit 0
