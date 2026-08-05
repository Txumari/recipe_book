## Why

To guarantee code quality, catch regressions early, and enforce continuous integration on GitHub (`Txumari/recipe_book`), all test suites (Vitest unit, Supertest HTTP integration, and Playwright E2E browser tests) and production build checks should run automatically on every push and pull request to `main`. Furthermore, Pull Requests should automatically post a sticky summary comment reporting test outcomes and upload failure screenshots/traces as workflow artifacts.

## What Changes

- **Convenience npm scripts**: Add `npm run test`, `npm run test:e2e`, `npm run test:all`, and `npm run build` in `package.json`.
- **GitHub Actions Workflow File**: Create `.github/workflows/ci.yml` configuring Node.js v20 on `ubuntu-latest`.
- **Automated PR Commenting**: Post/update an in-place sticky comment on PRs with status tables for unit, E2E, and build steps.
- **Failure Diagnostic Artifacts**: Automatically record and upload Playwright failure screenshots and trace logs (`actions/upload-artifact@v4`) when E2E tests fail.

## Capabilities

### New Capabilities

### Modified Capabilities
- `recipe-creation`: Enforce automated Continuous Integration (CI) test execution, sticky PR comment reporting, and failure artifact uploading via GitHub Actions workflows.

## Impact

- `package.json`: Add convenience test scripts.
- `.github/workflows/ci.yml`: New GitHub Actions workflow pipeline configuration.
