# Security Policy

Assisted-By Guard is an early open-source project for deterministic policy checks around DCO-style accountability and AI-assistance disclosure.

## Supported Versions

Security fixes are currently considered for the latest GitHub release and the `main` branch.

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |

## Reporting a Security Issue

Please do not open a public issue with exploit details, credentials, tokens, or sensitive repository data.

If GitHub private vulnerability reporting is available for this repository, use that channel. If it is not available, open a minimal public issue asking for a private contact path and omit sensitive details until a maintainer responds.

For non-sensitive bugs, confusing policy behavior, documentation issues, or feature requests, use the issue templates.

## Current Security Scope

In scope:

- Token handling in the GitHub Action.
- Read-only pull request data collection behavior.
- Unsafe logging of sensitive data.
- Unexpected write permissions, mutation behavior, or network behavior.
- CLI parsing or local git range handling issues that could mislead maintainers.

Out of scope:

- Requests to detect AI authorship.
- Requests to review code quality with AI.
- Vulnerabilities in unrelated third-party services.
- Social engineering or spam reports.

The project does not currently publish npm packages.
