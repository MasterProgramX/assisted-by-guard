# CLI

The CLI command is `assisted-by`.

```sh
assisted-by init
assisted-by check-commits --input examples/fixtures/commit-message.txt
assisted-by check-pr --pr examples/fixtures/pr.valid.json --policy examples/advisory-policy.yml
assisted-by policy doctor
assisted-by render-comment --pr examples/fixtures/pr.valid.json
```

The MVP CLI only reads explicit local files. It does not call the GitHub API, collect pull request data, post comments, mutate pull requests, or require secrets.

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
```

`check-pr` checks explicit local PR fixture data:

```sh
assisted-by check-pr --pr examples/fixtures/pr.valid.json --policy examples/advisory-policy.yml
assisted-by check-pr --commits examples/fixtures/commits.valid.json --new-files examples/fixtures/new-files.valid.json --policy examples/strict-policy.yml
```

`policy doctor` validates policy syntax and option combinations:

```sh
assisted-by policy doctor --policy examples/strict-policy.yml
```

`render-comment` renders deterministic Markdown output suitable for a future PR comment or check summary:

```sh
assisted-by render-comment --pr examples/fixtures/pr.valid.json --policy examples/advisory-policy.yml
assisted-by render-comment --pr examples/fixtures/pr.strict-findings.json --policy examples/strict-policy.yml
```

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
