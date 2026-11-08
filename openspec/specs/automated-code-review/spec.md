# automated-code-review Specification

## Purpose

Provides a provider-independent AI review of pull requests that checks changes against the project rules documented in `AGENTS.md`, reports findings on the PR, and gates merging through a required commit status.

## Requirements

### Requirement: Review Triggers
The review SHALL run automatically when a non-draft pull request targeting `main` is opened or marked ready for review, and on demand when the `needs-review` label is added or a user with write access comments `/review` on the PR. It SHALL NOT run on new pushes alone.

#### Scenario: PR opened
- **WHEN** a non-draft pull request targeting `main` is opened
- **THEN** one review run MUST start for its head commit

#### Scenario: Push without request
- **WHEN** a new commit is pushed to an open pull request and no label or `/review` comment is added
- **THEN** no review run MUST start, and the new head commit MUST have no `agent-review` status, so the PR cannot merge until it is re-reviewed

#### Scenario: Re-review on demand
- **WHEN** a user with write access comments `/review` on the PR, or adds the `needs-review` label
- **THEN** a review run MUST start for the PR's current head commit, and the `needs-review` label MUST be removed once the run finishes so that it can be applied again

#### Scenario: Comment from user without write access
- **WHEN** a user without write access comments `/review`
- **THEN** no review run MUST start

### Requirement: Skipped Pull Requests
The review SHALL NOT run for draft pull requests or for pull requests from forks.

#### Scenario: Draft PR
- **WHEN** a draft pull request is opened
- **THEN** no review run MUST start until the PR is marked ready for review

#### Scenario: Fork PR
- **WHEN** a pull request whose head repository differs from the base repository is opened
- **THEN** the review MUST be skipped without failing the workflow, and no `agent-review` status MUST be set, so the PR cannot merge from the fork

### Requirement: Single Active Run per PR
At most one review run SHALL be active per pull request; a new run for the same PR SHALL cancel the one in progress.

#### Scenario: Two triggers in quick succession
- **WHEN** a second review run starts for a PR while a first one is still running
- **THEN** the first run MUST be cancelled and only the second run MUST publish results

### Requirement: Rule-Based Reviewer Coverage
Each run SHALL execute three independent reviewers: `architecture` (rules R2–R5), `tests` (R6–R7) and `spec` (R8). Every finding SHALL cite one rule ID from `AGENTS.md`.

#### Scenario: Architecture violation found
- **WHEN** a PR adds domain validation inside an HTTP controller instead of the entity
- **THEN** the `architecture` reviewer MUST report a finding citing R2 on the controller file

#### Scenario: Spec conformance check
- **WHEN** a PR includes or archives an OpenSpec change
- **THEN** the `spec` reviewer MUST compare the diff against that change's requirements, scenarios and checked tasks, and report missing or out-of-scope behaviour citing R8

#### Scenario: No OpenSpec change in PR
- **WHEN** a PR touches source code but contains no OpenSpec change under `openspec/changes/`
- **THEN** the `spec` reviewer MUST report one finding citing R8 stating that the PR has no associated change

### Requirement: Findings Contract
Every reviewer and the verifier SHALL output a findings document that validates against a common JSON schema. Each finding in the document SHALL have a file, a line, a rule ID, a severity (`blocker`, `major`, `minor` or `nit`), a confidence between 0 and 1, and a message. Output that does not validate against the schema SHALL count as an engine failure.

#### Scenario: Valid output
- **WHEN** a reviewer finishes
- **THEN** its output MUST validate against the findings schema, and an empty findings list MUST be valid

#### Scenario: Malformed output
- **WHEN** a reviewer's output is not valid JSON or does not validate against the schema
- **THEN** that reviewer's attempt MUST be treated as failed for engine-fallback purposes

### Requirement: Verification Pass
After all reviewers finish, a verifier SHALL re-check their combined findings against the diff and SHALL discard findings that are duplicated, below 0.6 confidence, or not supported by the code.

#### Scenario: Duplicate findings merged
- **WHEN** two reviewers report the same rule on the same file and line
- **THEN** the published result MUST contain that finding once

#### Scenario: Low-confidence finding dropped
- **WHEN** a finding has confidence below 0.6
- **THEN** it MUST NOT be published

### Requirement: Engine Fallback
Each reviewer and the verifier SHALL first run on Claude Sonnet. They SHALL be retried once on Gemini when the Claude attempt fails for any reason: missing credentials, a usage limit, a timeout, a non-zero exit, or invalid output.

#### Scenario: Claude usage limit reached
- **WHEN** the Claude attempt for a reviewer fails because the subscription usage limit is exhausted
- **THEN** the same reviewer MUST run on Gemini, and the summary MUST record `gemini (fallback)` for that reviewer

#### Scenario: Both engines fail
- **WHEN** both the Claude and the Gemini attempts fail for a reviewer
- **THEN** the summary MUST mark that reviewer as unavailable with the failure reason, the other reviewers' findings MUST still be published, and the `agent-review` status MUST be `failure`

### Requirement: Publishing Results
A deterministic publisher with no LLM SHALL post the verified findings as a single non-approving PR review. Findings on lines inside the diff SHALL appear as inline comments, and all other findings SHALL be listed in a sticky summary comment that is updated in place.

#### Scenario: Inline finding
- **WHEN** a verified finding targets a line that is part of the PR diff
- **THEN** it MUST appear as an inline review comment on that line showing rule ID, severity and message

#### Scenario: Finding outside the diff
- **WHEN** a verified finding targets a line that is not part of the PR diff
- **THEN** it MUST be listed in the sticky summary instead of as an inline comment

#### Scenario: Summary contents
- **WHEN** a run finishes
- **THEN** the sticky summary MUST show the reviewed commit, the verdict, the engine used by each reviewer, and the number of findings by severity, and it MUST replace the previous run's summary rather than adding a new comment

#### Scenario: Re-review does not repeat comments
- **WHEN** a re-review produces a finding with the same file, line and rule as an inline comment the review already posted on that PR
- **THEN** the finding MUST NOT be posted again as a new inline comment

### Requirement: Merge Gate
Each review run SHALL set an `agent-review` commit status, required by the `main` ruleset, on the reviewed head commit. It SHALL be `pending` while the run is in progress, `success` only when all three reviewers produced a result and no finding of any severity survived, and `failure` otherwise. The review SHALL never approve or request changes.

#### Scenario: Clean review
- **WHEN** every reviewer ran and no finding survived
- **THEN** the `agent-review` status on the head commit MUST be `success`

#### Scenario: Any finding blocks
- **WHEN** at least one finding of any severity, including `nit`, survives the filter
- **THEN** the `agent-review` status MUST be `failure`, the PR MUST NOT be mergeable, and the PR review event MUST still be a plain comment

#### Scenario: Reviewer unavailable
- **WHEN** a reviewer produced no result because both engines failed
- **THEN** the `agent-review` status MUST be `failure` and the summary MUST say how to re-run the review

#### Scenario: Verifier unavailable
- **WHEN** only the verifier failed and the reviewer findings, after the deterministic filter, are empty
- **THEN** the `agent-review` status MUST be `success`

#### Scenario: Run interrupted
- **WHEN** a review run is cancelled or fails before the publisher sets the final status
- **THEN** the `agent-review` status MUST remain `pending` and the PR MUST NOT be mergeable

### Requirement: Least-Privilege Execution
AI engines SHALL have read-only access to the repository and its diff. They SHALL have no shell or network tools beyond reading files and running `git diff`/`git log`, and SHALL hold no GitHub write token. Only the publisher SHALL have permission to write PR comments and set the final status; the gate job, which runs no LLM, MAY set the `pending` status.

#### Scenario: Prompt injection in PR content
- **WHEN** a changed file contains text instructing the reviewer to run commands or post comments
- **THEN** the engine MUST NOT be able to execute arbitrary commands or write to GitHub, and the only effect possible MUST be the text of findings that the publisher renders
