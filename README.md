# Assisted-By Guard

DCO-style accountability for AI-assisted open-source contributions.

Assisted-By Guard is an open-source GitHub Action and CLI for checking whether a pull request follows a repository's AI contribution disclosure policy. It is deterministic, runs without an AI API, and focuses on transparent human accountability.

This project is not an AI detector. It is not an AI PR reviewer. It does not accuse contributors of using AI. Instead, it checks explicit repository rules such as DCO-style human sign-off, accepted disclosure trailers, SPDX headers for new files, and whether AI tools are kept out of DCO signer fields.

Humans remain responsible for DCO and sign-off. AI tools must not be treated as DCO signers.

## Status

This repository currently contains an initial MVP structure:

- `packages/core`: deterministic policy, trailer, SPDX, and Markdown report helpers
- `packages/cli`: local CLI skeleton for explicit file inputs, fixtures, and git ranges
- `packages/github-action`: bundled action wrapper for explicit local input files and read-only PR event collection
- `examples`: permissive, advisory, and strict policy examples
- `docs`: policy and usage notes

The core package and CLI remain network-free. The GitHub Action can optionally use read-only GitHub API calls in `pull_request` workflows to collect commit messages and newly added source files. No PR mutation, comments, telemetry, configured secrets, or AI/API integration are included in the MVP.

This repository dogfoods its own action in advisory mode for pull requests. The workflow is intentionally read-only and non-mutating while the project continues to mature.

## Install

```sh
pnpm install
pnpm build
pnpm test
```

## CLI

The CLI command is `assisted-by`.

```sh
assisted-by init
assisted-by check-commits --input examples/fixtures/commit-message.txt
assisted-by check-commits --range main..HEAD --policy examples/advisory-policy.yml
assisted-by check-pr --pr examples/fixtures/pr.valid.json --policy examples/advisory-policy.yml
assisted-by check-pr --range main..HEAD --policy examples/strict-policy.yml
assisted-by policy doctor --policy .github/assisted-by.yml
assisted-by render-comment --pr examples/fixtures/pr.valid.json
```

The default posture is advisory: report issues clearly without failing the run unless a repository chooses strict mode.

See [`docs/cli.md`](docs/cli.md) for local fixture formats and local git range examples.

## GitHub Action

The GitHub Action is bundled for tagged use from the `packages/github-action` path. After an explicit `v0.1.0` tag is created, it can run in a `pull_request` workflow with read-only permissions:

```yaml
name: Assisted-By Guard

on:
  pull_request:

permissions:
  contents: read
  pull-requests: read

jobs:
  assisted-by:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: MasterProgramX/assisted-by-guard/packages/github-action@v0.1.0
        with:
          policy-path: .github/assisted-by.yml
```

When no explicit local JSON input is provided, the action reads pull request commits and files through GitHub's read-only API. It does not post comments, request write permissions, or mutate pull requests.

See [`docs/github-action.md`](docs/github-action.md) for fixture mode, dogfooding mode, tagged usage, and bundle maintenance.

## Policy

The default policy path is `.github/assisted-by.yml`.

```yaml
mode: advisory
require_ai_disclosure: false
accepted_trailers:
  - Assisted-by
forbid_ai_signed_off_by: true
require_human_dco: true
require_spdx_for_new_files: false
accepted_tools:
  - GitHub Copilot
  - ChatGPT
```

See `examples/` for permissive, advisory, and strict variants.

This repository's live dogfooding policy is `.github/assisted-by.yml`.

## Current Limitations

- The CLI and core package are local and deterministic. They do not call GitHub APIs or AI APIs.
- The GitHub Action only collects pull request data in read-only mode. It does not post PR comments or create manual check runs.
- Assisted-By Guard checks explicit policy evidence. It does not infer whether AI was used and does not review code quality.
- v0.1.0 is the first public release and should not be treated as broadly proven production infrastructure yet.

## Contributing

See `CONTRIBUTING.md` and `docs/DCO_AND_AI.md` for human DCO/sign-off and AI assistance disclosure guidance.

Release preparation notes live in [`docs/RELEASE.md`](docs/RELEASE.md).

## License

MIT
