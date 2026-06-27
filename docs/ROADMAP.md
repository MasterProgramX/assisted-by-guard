# Roadmap

This roadmap is a lightweight guide for contributors. It is not a promise of dates or scope.

Assisted-By Guard stays focused on deterministic, non-accusatory policy checks for AI-assistance disclosure and DCO-style human accountability.

## v0.1.x Maintenance

- Improve step-summary wording and report readability.
- Add more real-world policy examples.
- Add monorepo fixtures and local git range examples.
- Strengthen integration tests for CLI and GitHub Action usage.
- Keep the bundled action runtime current with GitHub Actions platform changes.
- Continue DCO/SPDX edge-case hardening and optional non-mutating summary improvements.

## Possible v0.2.0 Work

- Explore the root Action wrapper recommendation in [`ACTION_DISTRIBUTION.md`](ACTION_DISTRIBUTION.md) for a future v0.2.0 release.
- Follow the npm publishing plan in [`NPM_PUBLISHING.md`](NPM_PUBLISHING.md) when the CLI and core packages are ready for a future manual npm release.
- Add more maintainer-oriented policy presets.
- Improve release smoke-test automation for packaged action tags.
- Document migration guidance for repositories adopting DCO-style AI-assistance disclosure.

## Non-Goals

- AI authorship detection.
- AI code review.
- PR comments or mutation by default.
- Write permissions by default.
- Telemetry or secret-dependent behavior.
- GitHub App behavior.

## Future Repository Polish

A future social preview image could use the text: "Assisted-By Guard - DCO-style accountability for AI-assisted OSS contributions."
