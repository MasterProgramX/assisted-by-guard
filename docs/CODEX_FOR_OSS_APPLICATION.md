# Codex For OSS Application Readiness

This document is a preparation dossier for a possible future Codex for OSS application. It is not a submitted application, and it does not claim acceptance, eligibility, credits, users, downloads, or ecosystem adoption.

Official program requirements must be verified against current OpenAI sources before any submission. During this preparation pass, no current public official OpenAI page for a Codex for OSS application program was located from official-domain search, so this document keeps requirements as a manual verification item.

## Project Summary

Assisted-By Guard helps open-source maintainers safely accept AI-assisted contributions by enforcing human accountability, DCO compatibility, and transparent AI-assistance disclosure without trying to detect or shame AI usage.

Repository: https://github.com/MasterProgramX/assisted-by-guard

Current release: `v0.2.0`

Current GitHub Action usage:

```yaml
uses: MasterProgramX/assisted-by-guard@v0.2.0
```

## Problem Statement

AI-assisted contributions are becoming normal in open-source projects, but many maintainers need a practical way to keep human accountability clear. DCO-style sign-off is about a human contributor taking responsibility for a change. AI tools can assist, but they should not become DCO signers, authors of record, or a reason to accuse contributors.

Maintainers need a deterministic, low-drama way to answer questions such as:

- Does this contribution include a human `Signed-off-by` trailer when required?
- If AI assistance is disclosed, does it use an accepted trailer such as `Assisted-by`?
- Are configured AI tool names kept out of DCO signer fields?
- Do newly added source-like files include SPDX headers when the repository requires them?
- Can the check run without calling an AI API or mutating a pull request?

## Why This Matters For OSS Maintainers

Maintainers often need policy clarity, not authorship speculation. A contribution workflow that accuses contributors or tries to infer AI usage can make review less trusting and less useful. A deterministic disclosure check gives maintainers a smaller, more maintainable surface:

- Human accountability remains explicit.
- Repository policy is visible and reviewable.
- Contributors can fix missing trailers or SPDX headers without being accused.
- Projects can start in advisory mode and move to stricter enforcement only when ready.

## What Assisted-By Guard Does

- Parses commit trailers such as `Signed-off-by`, `Assisted-by`, `Generated-by`, and `Co-authored-by`.
- Validates `.github/assisted-by.yml` policy files.
- Checks human DCO-style sign-off.
- Checks accepted AI-assistance disclosure trailers and configured tool names.
- Prevents configured tool names from acting as DCO signers.
- Checks SPDX headers for newly added source-like files when configured.
- Renders deterministic Markdown reports for CLI output and Action job summaries.
- Runs as a CLI against explicit local inputs or local git ranges.
- Runs as a GitHub Action with read-only pull request event collection.

## What It Intentionally Does Not Do

- It is not an AI detector.
- It is not an AI PR reviewer.
- It does not accuse contributors.
- It does not execute pull request code.
- It does not mutate pull requests.
- It does not post comments by default.
- It does not require secrets for normal read-only Action usage.
- It does not use AI APIs.
- It does not use telemetry.
- It does not provide GitHub App behavior.

## Safety Posture

Assisted-By Guard is deterministic and policy-based. Its GitHub Action examples use read-only permissions:

```yaml
permissions:
  contents: read
  pull-requests: read
```

The current Action can read pull request commits and newly added source-like files through GitHub's read-only APIs. It does not request write permissions, create check runs manually, post comments, push commits, label pull requests, or edit repository state.

The CLI and core package remain local and network-free.

## Current Evidence

Snapshot from repository inspection on 2026-06-27:

- Public repository: `MasterProgramX/assisted-by-guard`
- Description: `DCO-style accountability for AI-assisted open-source contributions.`
- Topics: `ai-assisted`, `ai-governance`, `cli`, `dco`, `developer-tools`, `github-actions`, `maintainer-tools`, `open-source`, `pull-requests`, `spdx`, `supply-chain-security`, `typescript`
- GitHub releases: `v0.1.0`, `v0.1.1`, and `v0.2.0`
- Latest release: `v0.2.0`
- Recent CI runs on `main`: passing
- Tagged Action smoke test: passed for packaged Action usage
- Dogfooding workflow: active in advisory mode for pull requests
- Manual fixture workflow: available via `workflow_dispatch`
- Community files: `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, pull request template, issue templates
- Docs: CLI, GitHub Action, policy, examples, DCO and AI guidance, release checklist, Action distribution strategy, npm publishing plan
- Examples: permissive, advisory, strict, solo maintainer, DCO-heavy, security-sensitive, docs-only, and monorepo fixtures
- Completed project issues: real-world policy examples, monorepo fixtures, Action distribution strategy, npm publishing plan
- Public metrics at inspection time: 0 stars and 0 forks, which is expected for a new project

## Current Limitations

- The project is new and should not claim adoption, maturity, downloads, users, or production usage.
- npm packages are published manually for `@assisted-by-guard/core` and `assisted-by-guard`.
- The current tagged Action supports root usage, with the package subpath retained for compatibility.
- No GitHub Marketplace listing exists.
- No optional PR comment mode exists.
- No GitHub App behavior exists.
- Policy checks are limited to explicit evidence in commits, configured policy, supplied file data, local git ranges, or read-only pull request event data.

## Responsible Use Of Codex Or API Credits

Codex or API credits could help this project in concrete maintainer-facing ways:

- Improve maintainer documentation and contributor examples.
- Add more policy fixtures based on real open-source workflows.
- Build safer optional step-summary or non-mutating report modes.
- Improve test coverage for edge cases around DCO trailers, SPDX headers, and local input schemas.
- Explore the root Action and GitHub Marketplace strategy documented in `docs/ACTION_DISTRIBUTION.md`.
- Maintain npm publishing safety using `docs/NPM_PUBLISHING.md`.
- Audit policy wording so reports remain clear, deterministic, and non-accusatory.

Credits should not be used for hidden surveillance, AI authorship detection, contributor scoring, or undisclosed review behavior.

## Suggested Application Answer Bullets

Use these as draft material only. Verify official application questions before submitting.

- Assisted-By Guard is a deterministic GitHub Action and CLI for DCO-style accountability in AI-assisted open-source contributions.
- It helps maintainers enforce transparent disclosure policy without trying to detect AI authorship.
- It keeps humans responsible for DCO/sign-off and prevents AI tools from being treated as DCO signers.
- It is read-only and non-mutating by default.
- It does not call AI APIs, post PR comments, execute PR code, or require secrets for normal Action use.
- The project already has public GitHub releases, passing CI, tagged Action smoke testing, dogfooding workflow, community files, examples, and documented limitations.
- Assistance would be used for documentation, fixtures, tests, release hardening, optional non-mutating summaries, and packaging readiness.

## Pre-Submission Checklist

Before submitting any application:

- Verify current official Codex for OSS eligibility and requirements from OpenAI.
- Confirm the repository is still public.
- Confirm latest CI is passing.
- Confirm latest GitHub release and Action usage path.
- Confirm npm package availability claims match the current registry state.
- Confirm no adoption metrics are claimed unless externally verifiable.
- Confirm README and docs still state the project is not an AI detector or AI PR reviewer.
- Confirm workflows do not request write permissions.
- Confirm no secrets, telemetry, PR mutation, or PR comment behavior has been added.
- Review `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, and issue templates.
- Re-run the standard validation checklist from `docs/RELEASE.md`.

## Do Not Claim

- Do not claim Codex for OSS acceptance.
- Do not claim npm availability.
- Do not claim GitHub Marketplace availability.
- Do not claim production maturity.
- Do not claim users, stars, forks, downloads, or adoption beyond current public evidence.
- Do not claim AI detection, AI review, or authorship inference.
- Do not claim the Action mutates pull requests or posts comments.
- Do not claim write-permission behavior.
- Do not claim security guarantees beyond the documented scope.
