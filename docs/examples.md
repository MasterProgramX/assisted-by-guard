# Policy Examples

The files in `examples/` show starting points for repository policy. They are intentionally small and deterministic: Assisted-By Guard checks explicit trailers, configured tool names, DCO-style sign-off, and SPDX headers for new source-like files. It does not detect AI usage, review code, or accuse contributors.

Use these examples as templates, then adjust them to match your repository's contribution policy.

## Policy Modes

- `permissive`: records findings as warnings and keeps friction low. This is useful while introducing the project to a repository or experimenting with policy language.
- `advisory`: gives maintainers a visible report without blocking by default. This is a good starting point for most repositories.
- `strict`: reports policy findings as errors. Use this only when contributors already understand the policy and maintainers are ready to enforce it.

## Examples

### `permissive-policy.yml`

Use this while evaluating the tool or introducing AI-assistance disclosure gradually. It accepts common disclosure trailers and keeps configured tool names out of DCO signer fields, but it does not require human DCO sign-off or SPDX headers.

### `advisory-policy.yml`

Use this for a balanced default. It requires human DCO-style sign-off, accepts disclosure trailers, and reports findings without blocking in advisory mode.

### `strict-policy.yml`

Use this only when the repository is ready to enforce disclosure, human DCO sign-off, and SPDX checks for new source-like files.

### `solo-maintainer-policy.yml`

Use this for a small or solo-maintainer project that wants transparency without surprising contributors. It keeps human DCO accountability visible and treats AI assistance disclosure as advisory.

### `dco-project-policy.yml`

Use this for a project that already expects DCO-style sign-off and wants stronger disclosure checks. It requires human sign-off and an accepted disclosure trailer, but still does not treat AI tools as DCO signers.

### `security-sensitive-policy.yml`

Use this for source-heavy repositories that care about SPDX headers on new source-like files. It is strict and should be paired with clear contributor documentation.

This policy does not review code security. It only checks deterministic policy evidence supplied by local fixtures, local git data, or read-only pull request event data.

### `docs-only-advisory-policy.yml`

Use this for documentation-heavy repositories where SPDX source-file checks and DCO sign-off may be too much friction. It still accepts disclosure trailers and keeps configured tools out of DCO signer fields.

## Non-Accusatory Wording

Policy text should explain what maintainers need, not speculate about how a contribution was written. Good wording focuses on evidence:

- A human `Signed-off-by` trailer is required.
- If AI assistance is disclosed, use an accepted trailer such as `Assisted-by`.
- Configured tools must not appear as DCO signers.
- New source-like files may need SPDX headers.

Avoid wording that claims the tool can determine authorship or detect tool use. Humans remain responsible for the contribution and for DCO/sign-off.

## Try an Example

```sh
assisted-by policy doctor --policy examples/solo-maintainer-policy.yml
assisted-by check-pr --pr examples/fixtures/pr.valid.json --policy examples/dco-project-policy.yml
assisted-by check-pr --pr examples/fixtures/pr.valid.json --policy examples/security-sensitive-policy.yml
```

The CLI and core package are local and deterministic. The GitHub Action can also run these policies in a read-only workflow using `MasterProgramX/assisted-by-guard/packages/github-action@v0.1.1`.
