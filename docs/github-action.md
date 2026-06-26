# GitHub Action

The initial action wrapper is intentionally small. It accepts explicit JSON file inputs, reads the local policy file, renders a Markdown report, and sets outputs.

It does not call the GitHub API, post comments, mutate pull requests, require secrets, or use telemetry.

The MVP action package is source-first: `action.yml` points at generated `dist/` output, but this scaffold does not commit built action artifacts. Direct workflow use should wait for a packaged release or a packaging step that includes the generated action entrypoint.

```yaml
name: Assisted-By Guard

on:
  pull_request:

jobs:
  assisted-by:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./packages/github-action
        with:
          policy-path: .github/assisted-by.yml
          commits-json: .tmp/commits.json
          new-files-json: .tmp/new-files.json
```

Future versions can add richer pull request data collection while keeping the validation core deterministic.
