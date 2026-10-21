# Design

## Context

See `proposal.md` - Why. Currently `.github/workflows/ci.yml` executes a single `build-and-test` job on `ubuntu-latest` using `actions/checkout@v4`, `actions/setup-node@v4` (with `node-version: 20`), `actions/upload-artifact@v4`, and `marocchino/sticky-pull-request-comment@v2`.

## Goals / Non-Goals

**Goals:**
- Eliminate the Node.js 20 action runner deprecation warning and `ubuntu-latest` Ubuntu 26 migration warning in GitHub Actions.
- Run project unit, integration, and Playwright E2E tests on Node.js 24 (`node-version: 24`) over a pinned `ubuntu-24.04` runner.

**Non-Goals:**
- Restructuring the CI pipeline jobs or adding matrix builds across multiple OS/Node versions.
- Upgrading application runtime dependencies unrelated to Node 24 compatibility.

## Decisions

1. **Pin `runs-on: ubuntu-24.04` instead of `ubuntu-latest` or `ubuntu-26.04`**
   - *Rationale*: `ubuntu-24.04` LTS immediately removes the `ubuntu-latest` migration banner while maintaining guaranteed compatibility with `npx playwright install --with-deps chromium` apt packages.
   - *Alternatives considered*: Moving directly to `ubuntu-26.04` (rejected for now to avoid Playwright system dependency surprises).

2. **Bump GitHub Actions to Node 24-native major releases (`@v5`)**
   - *Rationale*: `actions/checkout@v5` and `actions/setup-node@v5` natively declare `node24` in their action metadata, removing the forced-runtime deprecation warning.
   - *Alternatives considered*: Keeping `@v4` and relying on GitHub's forced Node 24 override (leaves deprecation warnings in CI logs).

3. **Upgrade project CI Node.js runtime to `node-version: 24`**
   - *Rationale*: Aligns the project test/build runtime with the GitHub Actions runner Node version (Node 24 LTS).

## Risks / Trade-offs

- **[Risk] Conditional steps (`actions/upload-artifact@v4` or `marocchino/sticky-pull-request-comment@v2`) may still use `node20` when triggered on failure or PRs** → Check/update `actions/upload-artifact` to the latest major/minor release supporting Node 24 if available, and keep PR comment action updated.
