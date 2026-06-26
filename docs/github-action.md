# GitHub Action

The initial action wrapper is intentionally small. It accepts explicit local JSON file inputs, reads the local policy file, renders a Markdown report, writes the job summary, and sets outputs.

It does not call the GitHub API, post comments, mutate pull requests, require secrets, or use telemetry.

The MVP action package is source-first: `action.yml` points at generated `dist/` output, but this scaffold does not commit built action artifacts. Local workflow use in this repository must install dependencies and run `pnpm build` before the local `uses: ./packages/github-action` step.

External tagged use, such as `uses: owner/assisted-by-guard@v1`, should wait for a packaged release that includes a bundled action entrypoint.

## Inputs

- `policy-path`: local policy file path. Defaults to `.github/assisted-by.yml`.
- `pr-json`: local PR fixture JSON file with `commits` and optional `new_files` arrays.
- `commits-json`: local JSON array of commit records. Do not use with `pr-json`.
- `new-files-json`: local JSON array of new file records. Do not use with `pr-json`.

At least one of `pr-json`, `commits-json`, or `new-files-json` is required. `pr-json` cannot be combined with the split input files.

## Local Fixture Workflow

The repository includes `.github/workflows/assisted-by-fixture.yml` as a manual workflow that runs the action against checked-in fixtures:

```yaml
name: Assisted-By Guard Fixture

on:
  workflow_dispatch:

jobs:
  local-fixture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: ./packages/github-action
        with:
          policy-path: examples/advisory-policy.yml
          pr-json: examples/fixtures/pr.valid.json
```

This is a local fixture check, not PR data collection. Future versions can add richer pull request data collection while keeping the validation core deterministic.

## Release Checklist

Before users can consume this action by tag:

- Add a bundling step that produces a self-contained `packages/github-action/dist/index.js`.
- Decide whether generated action runtime files are committed for releases.
- Verify a tagged workflow with `uses: owner/assisted-by-guard@<tag>`.
- Keep the action no-secret, deterministic, and non-mutating unless a future release explicitly documents a new mode.
