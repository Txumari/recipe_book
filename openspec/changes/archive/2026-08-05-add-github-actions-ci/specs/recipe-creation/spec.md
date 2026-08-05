## ADDED Requirements

### Requirement: Automated GitHub Actions CI Workflow
The repository SHALL maintain a GitHub Actions workflow (`.github/workflows/ci.yml`) that executes on every `push` and `pull_request` to `main`, validating that all unit, HTTP integration, Playwright E2E tests pass and the production bundle builds without errors.

#### Scenario: Workflow execution on push or pull request
- **WHEN** a developer pushes a commit or opens a pull request targeting `main`
- **THEN** GitHub Actions MUST spin up a Node.js environment, install dependencies, run Vitest unit & integration tests (`npm run test`), run Playwright E2E browser tests (`npm run test:e2e`), and execute Vite build (`npm run build`).

### Requirement: PR Test Results Sticky Commenting
The CI workflow SHALL post or update an in-place sticky comment on Pull Requests summarizing test execution status and outcomes across unit, integration, E2E, and build steps.

#### Scenario: Updating PR comment on new commits
- **WHEN** a pull request triggers CI workflow execution
- **THEN** the workflow MUST publish or update a single sticky PR comment containing a Markdown status summary table without posting duplicate comment threads.

### Requirement: Failure Diagnostic Artifact Uploads
The CI workflow SHALL automatically capture and upload Playwright test failure artifacts (screenshots, video recordings, trace files) whenever E2E browser tests fail.

#### Scenario: E2E test failure artifact retention
- **WHEN** any Playwright E2E test step fails during CI execution
- **THEN** the workflow MUST execute `actions/upload-artifact@v4` to attach `test-results/` as a downloadable workflow artifact.
