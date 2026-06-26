# CLI

The CLI command is `assisted-by`.

```sh
assisted-by init
assisted-by check-commits --input commit-message.txt
assisted-by check-pr --commits commits.json --new-files new-files.json
assisted-by policy doctor
assisted-by render-comment --commits commits.json
```

## Input Formats

`--commits` expects a JSON array:

```json
[
  {
    "sha": "abc123",
    "message": "Add feature\n\nSigned-off-by: Ada Lovelace <ada@example.com>\nAssisted-by: ChatGPT"
  }
]
```

`--new-files` expects a JSON array:

```json
[
  {
    "path": "src/index.ts",
    "content": "// SPDX-License-Identifier: MIT\nexport {};"
  }
]
```
