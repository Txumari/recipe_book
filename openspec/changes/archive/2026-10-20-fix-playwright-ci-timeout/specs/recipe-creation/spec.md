## ADDED Requirements

### Requirement: Explicit IPv4 Loopback and WebServer Startup Buffers
The E2E test configuration (`playwright.config.ts`) SHALL specify explicit `127.0.0.1` IPv4 loopback URLs and set `reuseExistingServer: !process.env.CI` to guarantee reliable process startup and polling in CI.

#### Scenario: Running Playwright in CI runner
- **WHEN** Playwright executes in a CI environment (`process.env.CI` is truthy)
- **THEN** Playwright MUST poll backend/frontend health checks via `http://127.0.0.1` IPv4 loopback endpoints and force fresh process spawning without reusing stale background servers.
