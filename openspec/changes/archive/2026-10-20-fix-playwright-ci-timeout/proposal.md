## Why

In GitHub Actions Linux runner environments, Playwright E2E tests time out because Node.js v20 resolves `localhost` to IPv6 (`::1`), whereas Express and Vite listen on IPv4 (`127.0.0.1`). As a result, Playwright's health check polls `::1`, fails to connect, and times out after 60 seconds thinking no server is running.

## What Changes

- **Explicit IPv4 Loopback**: Update `playwright.config.ts` to use `http://127.0.0.1:5173` and `http://127.0.0.1:3000/api/health` instead of `localhost`.
- **CI Process Lifecycle Management**: Set `reuseExistingServer: !process.env.CI` to ensure clean process spawning and shutdown in CI.
- **WebServer Startup Buffer**: Increase `webServer.timeout` to 120 seconds to accommodate cold start times in GitHub Actions runners.

## Capabilities

### New Capabilities

### Modified Capabilities
- `recipe-creation`: Ensure reliable webServer process startup and IPv4 loopback binding for E2E testing in CI environments.

## Impact

- `playwright.config.ts`: Update `use.baseURL` and `webServer` settings.
