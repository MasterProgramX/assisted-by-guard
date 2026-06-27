# Changelog

All notable changes to this project will be documented in this file.

## 0.1.1 - 2026-06-27

Patch release for GitHub Action runtime and release hygiene.

- Updated the GitHub Action metadata to use the Node 24 runtime.
- Added explicit read-only permissions to CI and manual fixture workflows.
- Updated release checklist guidance to smoke-test packaged action tag usage.
- Documented the packaged action path for tagged workflow usage.

Known limitations:

- npm packages are not published yet.
- No AI detection, AI review, AI API calls, telemetry, secrets, PR comments, PR mutation, GitHub App behavior, or write permissions.

## 0.1.0 - 2026-06-27

First public GitHub release.

- Added a pnpm TypeScript workspace with `packages/core`, `packages/cli`, and `packages/github-action`.
- Added deterministic commit trailer parsing for `Signed-off-by`, `Assisted-by`, `Co-authored-by`, and `Generated-by`.
- Added policy validation for human DCO-style sign-off, accepted disclosure trailers, configured tool names, and AI/tool names in DCO signer fields.
- Added SPDX header checks for newly added source-like files.
- Added deterministic Markdown report rendering for CLI output, job summaries, and future PR comment bodies.
- Added CLI fixture mode for explicit PR, commits, and new-files JSON inputs.
- Added CLI local git range mode for commit messages and newly added files.
- Added a bundled GitHub Action runtime for tag-based workflow use.
- Added read-only `pull_request` event collection in the GitHub Action.
- Added advisory self-dogfooding workflow, repository policy, pull request template, and DCO/AI contribution guidance.

Known limitations:

- No AI detection, AI review, AI API calls, telemetry, secrets, PR comments, PR mutation, or GitHub App behavior.
- The GitHub Action collects pull request data only in read-only mode and does not create manual check runs.
- Policy checks are limited to explicit configured evidence and deterministic local or read-only event data.
- npm packages are not published yet.
