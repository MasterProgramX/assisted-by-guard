# CLI

The CLI command is `assisted-by`.

```sh
assisted-by init
assisted-by check-commits --input examples/fixtures/commit-message.txt
assisted-by check-commits --range main..HEAD --policy examples/advisory-policy.yml
assisted-by check-pr --pr examples/fixtures/pr.valid.json --policy examples/advisory-policy.yml
assisted-by check-pr --range main..HEAD --policy examples/strict-policy.yml
assisted-by policy doctor
assisted-by render-comment --pr examples/fixtures/pr.valid.json
```

The MVP CLI reads explicit local files or explicit local git ranges. It does not call the GitHub API, collect pull request data from remotes, post comments, mutate pull requests, or require secrets.

## Commands

`init` writes a starter policy file:

```sh
assisted-by init
assisted-by init --policy .github/assisted-by.yml
```

`check-commits` checks one commit message file or a JSON array of commit records:

```sh
assisted-by check-commits --input examples/fixtures/commit-message.txt
assisted-by check-commits --commits examples/fixtures/commits.valid.json --policy examples/advisory-policy.yml
assisted-by check-commits --range main..HEAD --policy examples/advisory-policy.yml
```

`check-pr` checks explicit local PR fixture data or a local git range:

```sh
assisted-by check-pr --pr examples/fixtures/pr.valid.json --policy examples/advisory-policy.yml
assisted-by check-pr --commits examples/fixtures/commits.valid.json --new-files examples/fixtures/new-files.valid.json --policy examples/strict-policy.yml
assisted-by check-pr --range main..HEAD --policy examples/strict-policy.yml
```

`policy doctor` validates policy syntax and option combinations:

```sh
assisted-by policy doctor --policy examples/strict-policy.yml
```

`render-comment` renders deterministic Markdown output suitable for a future PR comment or check summary:

```sh
assisted-by render-comment --pr examples/fixtures/pr.valid.json --policy examples/advisory-policy.yml
assisted-by render-comment --pr examples/fixtures/pr.strict-findings.json --policy examples/strict-policy.yml
assisted-by render-comment --range main..HEAD --policy examples/advisory-policy.yml
```

## Local Git Ranges

`--range` is an explicit local git input mode. It runs deterministic local git commands against the repository where the CLI is invoked.

```sh
assisted-by check-commits --range main..HEAD --policy examples/advisory-policy.yml
assisted-by check-pr --range main..HEAD --policy examples/strict-policy.yml
assisted-by render-comment --range main..HEAD --policy examples/advisory-policy.yml
```

For `check-commits`, the range supplies commit messages from `git log`.

For `check-pr` and `render-comment`, the range supplies commit messages plus new files from `git diff --diff-filter=A`; new file contents are read from the right side of the range.

`--range` cannot be combined with `--pr`, `--commits`, `--new-files`, or `--input`. The CLI does not guess a default branch or contact a remote.

## Input Formats

`--pr` expects a JSON object:

```json
{
  "commits": [
    {
      "sha": "abc123",
      "message": "Add feature\n\nSigned-off-by: Ada Lovelace <ada@example.com>\nAssisted-by: GitHub Copilot"
    }
  ],
  "new_files": [
    {
      "path": "src/index.ts",
      "content": "// SPDX-License-Identifier: MIT\nexport {};\n"
    }
  ]
}
```

`commits` is required. `new_files` is optional and defaults to an empty list.

`--commits` expects a JSON array:

```json
[
  {
    "sha": "abc123",
    "message": "Add feature\n\nSigned-off-by: Ada Lovelace <ada@example.com>\nAssisted-by: ChatGPT"
  }
]
```

`--input` expects a plain text commit message with trailers at the end:

```text
Add feature

Signed-off-by: Ada Lovelace <ada@example.com>
Assisted-by: GitHub Copilot
```

`--new-files` expects a JSON array:

```json
[
  {
    "path": "src/index.ts",
    "content": "// SPDX-License-Identifier: MIT\nexport {};\n"
  }
]
```

Invalid JSON files, missing required input files, or unsupported fixture shapes return a non-zero exit code with a clear error message.
