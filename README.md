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

## License

MIT
