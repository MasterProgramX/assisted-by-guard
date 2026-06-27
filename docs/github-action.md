# GitHub Action

The action wrapper is intentionally small. It accepts explicit local JSON file inputs or, when those are absent, reads pull request data from the GitHub Actions `pull_request` event in read-only mode. It reads the local policy file, renders a Markdown report, writes the job summary, and sets outputs.

It does not post comments, mutate pull requests, require configured secrets, or use telemetry.

It is not an AI detector and not an AI PR reviewer. It checks explicit disclosure and accountability rules without accusing contributors.

The action runtime is bundled into `packages/github-action/dist/index.cjs` so release tags can run without asking users to install workspace dependencies. The bundle is generated from the TypeScript source and committed intentionally as the JavaScript Action entrypoint.

Tagged use supports explicit local input files and read-only `pull_request` event collection after a release tag is created. It does not infer AI usage and does not review code.

## Inputs

- `policy-path`: local policy file path. Defaults to `.github/assisted-by.yml`.
- `pr-json`: local PR fixture JSON file with `commits` and optional `new_files` arrays.
- `commits-json`: local JSON array of commit records. Do not use with `pr-json`.
- `new-files-json`: local JSON array of new file records. Do not use with `pr-json`.
- `github-token`: GitHub token for read-only `pull_request` event collection. Defaults to `${{ github.token }}`.

Explicit local inputs take precedence. If `pr-json` is provided, the action uses it. Otherwise, if `commits-json` or `new-files-json` are provided, the action uses those split local files. If no local JSON input is provided, the action attempts read-only `pull_request` event collection.

`pr-json` cannot be combined with the split input files.

## Local Fixture Workflow

The repository includes `.github/workflows/assisted-by-fixture.yml` as a manual workflow that runs the committed local action bundle against checked-in fixtures:

```yaml
name: Assisted-By Guard Fixture

on:
  workflow_dispatch:

jobs:
  local-fixture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./packages/github-action
        with:
          policy-path: examples/advisory-policy.yml
          pr-json: examples/fixtures/pr.valid.json
```

This is a local fixture check, not PR event collection.

## Pull Request Workflow

After an explicit release tag is created, pull request workflows can reference the tagged action with only read permissions:

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
      - uses: MasterProgramX/assisted-by-guard@v0.1.0
        with:
          policy-path: .github/assisted-by.yml
```

When no local JSON input is provided, the action reads the event file from `GITHUB_EVENT_PATH`, lists pull request commits, and lists pull request files through the GitHub REST API. It downloads contents only for newly added source-like files when `require_spdx_for_new_files` is enabled.

Pull request content is treated as untrusted input. The action does not execute code from the pull request, does not run shell commands based on pull request data, does not log token values, and does not print file contents.

## Dogfooding Workflow

This repository uses its own bundled local action in `.github/workflows/assisted-by.yml`:

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
      - uses: ./packages/github-action
        with:
          policy-path: .github/assisted-by.yml
```

The dogfooding policy is advisory. It shows maintainers the report without posting comments or mutating pull requests.

## Tagged Usage With Local Inputs

After a release tag includes the committed bundle, workflows can also reference the action by tag while providing explicit local input files:

```yaml
- uses: MasterProgramX/assisted-by-guard@v0.1.0
  with:
    policy-path: .github/assisted-by.yml
    pr-json: .github/assisted-by-pr.json
```

That example assumes the workflow creates or checks in `.github/assisted-by-pr.json`.

## Bundle Maintenance

Run the action bundle build before tagging:

```sh
pnpm build:action
pnpm check:action-bundle
```

If `packages/github-action/src/`, `packages/core/src/`, or action dependencies change, regenerate and review `packages/github-action/dist/index.cjs`.

## Release Checklist

Before creating a release tag:

- Run `pnpm install --frozen-lockfile`.
- Run `pnpm test`, `pnpm build`, and `pnpm lint`.
- Run `pnpm check:action-bundle` and commit an updated `packages/github-action/dist/index.cjs` when it changes.
- Verify a tagged workflow with explicit local input files and `uses: MasterProgramX/assisted-by-guard@<tag>`.
- Keep the action no-secret, deterministic, and non-mutating unless a future release explicitly documents a new mode.

See [the release checklist](RELEASE.md) for the full pre-tag process.
