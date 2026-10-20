## 1. Playwright Configuration Update (`playwright.config.ts`)

- [x] 1.1 Update `use.baseURL` and `webServer` URLs to `http://127.0.0.1` and set `reuseExistingServer: !process.env.CI` in `playwright.config.ts`.

## 2. Verification

- [x] 2.1 Execute `npm run test:e2e` locally to verify clean Playwright webServer binding and test execution.
