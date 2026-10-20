## Context

See proposal.md for motivation and `specs/recipe-creation/spec.md` for requirements.

## Goals / Non-Goals

**Goals:**
- Update `playwright.config.ts` to use `http://127.0.0.1` explicitly.
- Configure `reuseExistingServer: !process.env.CI` to prevent stale server reuse in CI.
- Set `timeout: 120 * 1000` on both backend and frontend `webServer` blocks to allow sufficient cold start buffer in GitHub Actions runners.

**Non-Goals:**
- Modifying test assertion logic or domain error handling.

## Decisions

### 1. IPv4 Loopback (`127.0.0.1`) vs IPv6 (`localhost`)
- **Decision:** Change all `localhost` URLs in `playwright.config.ts` to `127.0.0.1`.
- **Rationale:** Prevents Node.js v20 on Linux from resolving `localhost` to IPv6 (`::1`) while Express and Vite listen on IPv4 (`127.0.0.1`).

### 2. Conditional `reuseExistingServer`
- **Decision:** Set `reuseExistingServer: !process.env.CI`.
- **Rationale:** Ensures clean process lifecycle management in CI environments while keeping local dev server reuse fast.

## Risks / Trade-offs

- [Risk] Slightly longer CI run duration when building servers from scratch in CI.
  → [Mitigation] Necessary for deterministic, isolated test execution; 120s timeout buffer prevents premature aborts.
