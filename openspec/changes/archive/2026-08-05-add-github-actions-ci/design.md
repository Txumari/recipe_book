## Context

See proposal.md for motivation and `specs/recipe-creation/spec.md` for requirements.

## Goals / Non-Goals

**Goals:**
- Configure package npm scripts (`test`, `test:e2e`, `test:all`, `build`) in `package.json`.
- Create `.github/workflows/ci.yml` targeting `ubuntu-latest` and Node.js v20.
- Execute unit & integration tests (`vitest run`), Playwright E2E browser tests (`npx playwright test`), and Vite build (`npx vite build`) in CI pipeline.
- Automatically capture and upload Playwright failure screenshots and trace logs (`actions/upload-artifact@v4`) when E2E tests fail.
- Post/update an in-place sticky comment (`marocchino/sticky-pull-request-comment@v2`) on Pull Requests with test results.

**Non-Goals:**
- Deployment pipelines to production cloud providers.

## Decisions

### 1. Dedicated npm Scripts
- **Decision:** Define explicit scripts in `package.json`:
  - `"test"`: `"vitest run"`
  - `"test:e2e"`: `"playwright test"`
  - `"test:all"`: `"npm run test && npm run test:e2e"`
  - `"build"`: `"vite build"`

### 2. GitHub Actions Workflow & PR Reporting Architecture
- **Decision:** Configure `.github/workflows/ci.yml` with top-level permissions:
  ```yaml
  permissions:
    contents: read
    pull-requests: write
  ```
- **Failure Artifacts:** Add step with `if: failure()` using `actions/upload-artifact@v4` pointing to `test-results/`.
- **Sticky PR Comment:** Add step with `if: github.event_name == 'pull_request' && always()` using `marocchino/sticky-pull-request-comment@v2` displaying job outcome status tables.

## Risks / Trade-offs

- [Risk] Playwright browser installation overhead in GitHub Actions runner.
  → [Mitigation] Limit Playwright installation to Chromium (`--with-deps chromium`) to minimize run duration.
