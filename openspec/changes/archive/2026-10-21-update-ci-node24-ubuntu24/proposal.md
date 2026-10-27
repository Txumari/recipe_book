# Proposal

## Why

GitHub Actions is emitting two runner/deprecation warnings on every CI run:
1. `actions/checkout@v4` and `actions/setup-node@v4` target the deprecated Node.js 20 runtime and are being forced onto Node.js 24.
2. `ubuntu-latest` is migrating to Ubuntu 26.04, creating risk of unannounced runner OS migration issues (particularly for `npx playwright install --with-deps chromium`).

Updating the CI workflow now silences both warnings, aligns our CI runtime with Node.js 24, and pins the runner OS to `ubuntu-24.04` for deterministic builds.

## What Changes

- Pin the `build-and-test` job runner image in `.github/workflows/ci.yml` from `ubuntu-latest` to `ubuntu-24.04`.
- Bump GitHub Actions in `.github/workflows/ci.yml` to versions targeting Node 24 (`actions/checkout@v5`, `actions/setup-node@v5`, and `actions/upload-artifact@v5` / `marocchino/sticky-pull-request-comment@v2` as applicable).
- Upgrade the configured project Node.js version in `actions/setup-node` from `20` to `24` (and align `@types/node` if needed).

## Capabilities

### New Capabilities
None (CI tooling and runner configuration update; `skip_specs: true` enabled).

### Modified Capabilities
None.

## Impact

- `.github/workflows/ci.yml`: Updated runner image (`ubuntu-24.04`), action versions (`@v5`), and Node.js version (`24`).
- `package.json` / `package-lock.json` (optional/if applicable): `@types/node` compatibility check with Node 24.
