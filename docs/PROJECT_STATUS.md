# Project Status

Assisted-By Guard is a new public OSS project for deterministic, non-accusatory policy checks around AI-assisted contributions and DCO-style human accountability.

Current version: `v0.1.1`

Repository: https://github.com/MasterProgramX/assisted-by-guard

Current GitHub Action usage:

```yaml
uses: MasterProgramX/assisted-by-guard/packages/github-action@v0.1.1
```

## What Works Today

- Deterministic policy validation from `.github/assisted-by.yml`.
- Commit trailer parsing for `Signed-off-by`, `Assisted-by`, `Generated-by`, and `Co-authored-by`.
- Human DCO-style sign-off checks.
- Configured AI-assistance disclosure checks using explicit accepted tool names.
- Guardrails that prevent configured AI tools from being treated as DCO signers.
- SPDX checks for newly added source-like files when enabled by policy.
- Markdown report rendering for CLI output and Action summaries.
- CLI checks from explicit fixture files.
- CLI checks from explicit local git ranges.
- A bundled GitHub Action runtime with read-only `pull_request` event collection.
- Advisory dogfooding workflow in this repository.
- Real-world policy examples and monorepo fixtures.

## Intentionally Not Implemented

- AI authorship detection.
- AI code review.
- PR comments.
- PR mutation.
- Write permissions.
- GitHub App behavior.
- Telemetry.
- Secrets or token-dependent behavior beyond the default read-only GitHub Actions token for PR event collection.
- AI/API integration.
- npm package publishing.

## Safety Posture

The project checks explicit policy evidence rather than inferring intent or authorship. Reports should help maintainers and contributors fix disclosure, DCO, and SPDX issues without accusation.

The CLI and core package are local and network-free. The GitHub Action can use GitHub's read-only API in `pull_request` workflows, but it does not execute pull request code, post comments, mutate pull requests, or request write permissions.

## Current Limitations

- The project is early and should not be treated as broadly proven production infrastructure.
- npm packages are not published yet; the CLI is currently used from a source checkout.
- The supported Action path is the package subpath shown above. A root Action path is not currently supported.
- GitHub Marketplace listing has not been implemented.
- Optional comment modes and richer step-summary modes are future work.
- Policy checks are limited to explicit trailers, policy configuration, supplied local inputs, local git ranges, or read-only pull request event data.

## Completed Milestones

- `v0.1.0`: first public GitHub release.
- `v0.1.1`: patch release for Node 24 Action runtime metadata and release hygiene.
- Packaged Action tag smoke test passed.
- Community profile files, issue templates, roadmap, and release checklist added.
- Issues #2, #3, #4, and #5 completed:
  - real-world policy examples
  - monorepo fixture examples
  - GitHub Action distribution strategy
  - npm publishing plan
- Codex for OSS application-readiness dossier prepared without submitting an application.

## Open Next Steps

- Keep CI and the bundled Action runtime current.
- Continue improving report wording and maintainer-facing examples.
- Add more integration coverage for CLI and Action behavior.
- Explore the documented root Action wrapper strategy for a future `v0.2.0`.
- Follow the documented npm publishing plan when the CLI and core packages are ready for a future manual npm release.
- Continue hardening DCO, trailer, and SPDX edge cases.

## Recommended Contributor Tasks

- Add more realistic policy examples from maintainer workflows.
- Add more monorepo and mixed-file fixtures.
- Improve step-summary wording while keeping reports non-accusatory.
- Strengthen tests for malformed trailers, policy combinations, and SPDX edge cases.
- Review `docs/ACTION_DISTRIBUTION.md` before proposing root Action or Marketplace changes.
- Review `docs/NPM_PUBLISHING.md` before proposing npm packaging changes.

## Notes For Future Applications

`docs/CODEX_FOR_OSS_APPLICATION.md` is a preparation dossier only. No application has been submitted. Official Codex for OSS requirements must be manually verified from current OpenAI sources before any submission.
