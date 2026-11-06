# Tasks

## 1. CI Workflow Runner & Actions Update

- [x] 1.1 Pin `runs-on` to `ubuntu-24.04` in `.github/workflows/ci.yml` and verify the workflow YAML is valid
- [x] 1.2 Upgrade `actions/checkout` and `actions/setup-node` to `@v5` and set `node-version: 24` in `.github/workflows/ci.yml`, verifying step names and syntax match
- [x] 1.3 Verify local unit tests (`npm run test`) and production build (`npm run build`) pass under the updated configuration
