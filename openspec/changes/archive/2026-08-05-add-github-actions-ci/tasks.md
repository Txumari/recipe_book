## 1. Package Script Configuration (`package.json`)

- [x] 1.1 Add `"test"`, `"test:e2e"`, `"test:all"`, and `"build"` convenience scripts to `package.json`.

## 2. GitHub Actions CI Pipeline Setup (`.github/workflows/ci.yml`)

- [x] 2.1 Update `.github/workflows/ci.yml` with `pull-requests: write` permissions, step IDs, Playwright failure artifact upload step (`actions/upload-artifact@v4`), and sticky PR comment step (`marocchino/sticky-pull-request-comment@v2`).

## 3. Verification & Execution

- [x] 3.1 Execute `npm run test`, `npm run test:e2e`, and `npm run build` locally to verify clean script execution.
