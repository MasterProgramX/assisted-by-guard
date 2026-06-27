# GitHub Action Distribution Strategy

Assisted-By Guard `v0.2.0` and later publish a root GitHub Action wrapper:

```yaml
uses: MasterProgramX/assisted-by-guard@v0.2.0
```

The packaged subpath Action remains available for compatibility:

```yaml
uses: MasterProgramX/assisted-by-guard/packages/github-action@v0.2.0
```

For `v0.1.x`, users should keep using `MasterProgramX/assisted-by-guard/packages/github-action@v0.1.1`.

## Current Layout

The repository is a pnpm TypeScript workspace:

- `packages/core`: deterministic policy, trailer, SPDX, local input, and report logic.
- `packages/cli`: local CLI for explicit inputs and local git ranges.
- `packages/github-action`: JavaScript Action wrapper and committed runtime bundle.

The Action package lives under `packages/github-action` so the CLI, core library, and Action can share one release process while keeping ownership boundaries clear. The committed Action runtime is `packages/github-action/dist/index.cjs`; both the root `action.yml` wrapper and `packages/github-action/action.yml` point to that bundle from their respective locations.

GitHub Actions supports public actions from a repository subdirectory with the syntax `{owner}/{repo}/{path}@{ref}`. GitHub Marketplace, however, expects a public repository with a single root `action.yml` or `action.yaml` metadata file for automatic listing; subfolder metadata files may exist but are not automatically listed.

References:

- GitHub workflow syntax for public actions and subdirectory actions: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepsuses
- GitHub action metadata syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax
- GitHub Marketplace action publishing requirements: https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace

## Strategy Options

| Option | User experience | Marketplace compatibility | Maintenance burden | Monorepo cleanliness | Release complexity | v0.1.1 compatibility | Risk | CLI/core organization |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A - Keep current subpath Action | `v0.1.x` users keep `MasterProgramX/assisted-by-guard/packages/github-action@v0.1.1`; discoverability is less obvious than root usage. | Weak for Marketplace because the metadata file is not at the repository root. | Low. Existing bundle and tests stay as-is. | Strong. Workspace package boundaries stay clear. | Low. Current release checklist already covers the package bundle. | Full compatibility. | Low. No migration. | Strong. |
| B - Add a root `action.yml` wrapper | Users can use `MasterProgramX/assisted-by-guard@v0.2.0`; current subpath can remain supported. | Stronger, because the repository root exposes Action metadata. | Medium. Root metadata and package metadata must stay aligned. | Good because the root file is a thin wrapper to `packages/github-action/dist/index.cjs`. | Medium. Release smoke tests must cover both root and subpath usage during transition. | Compatible because the subpath remains documented and tested. | Medium. A bad wrapper could break first-run trust. | Strong because implementation remains a wrapper. |
| C - Move the Action package to the repo root | Root usage becomes natural, but the repository becomes Action-first. | Strong. | Medium to high. Build, package, docs, and workspace paths all move. | Weaker. CLI and core package organization becomes less obvious. | High. Many docs and tests would need updates. | Compatible only if the old subpath is preserved or clearly migrated. | High for little immediate benefit. | Weaker. |
| D - Create a separate action-only repository | Clean Action consumer path such as `MasterProgramX/assisted-by-guard-action@v1`. | Strong for Marketplace. | High. Requires another repository, sync process, release coordination, and support surface. | Strong in this repo, but split ownership elsewhere. | High. Two repositories need coordinated release and smoke testing. | Compatible if current subpath remains. | Medium to high. More places to drift. | Strong here, weaker cross-repo. |

## Recommendation

Keep Option A for v0.1.x and adopt Option B for v0.2.0.

Do not move the Action package to the repository root. Do not create a separate action-only repository yet. The packaged subpath is valid, tested, and already released. The root wrapper is the smallest improvement for discoverability and possible Marketplace readiness because it preserves the workspace layout and keeps `packages/core`, `packages/cli`, and `packages/github-action` organized.

## v0.2.0 Migration Notes

For `v0.2.0` and later:

1. Keep the root `action.yml` mirrored with the package Action inputs and outputs.
2. Point the root metadata to the committed package bundle, `packages/github-action/dist/index.cjs`.
3. Keep `packages/github-action/action.yml` for compatibility.
4. Smoke-test both paths after tagging:

   ```yaml
   uses: MasterProgramX/assisted-by-guard@v0.2.0
   ```

   ```yaml
   uses: MasterProgramX/assisted-by-guard/packages/github-action@v0.2.0
   ```

5. Keep README, `docs/github-action.md`, and release notes aligned with the latest tagged Action paths.
6. Keep permissions read-only in examples:

   ```yaml
   permissions:
     contents: read
     pull-requests: read
   ```

7. Smoke-test the tagged root path before any release announcement.

## Current Non-Goals

- No Marketplace listing has been created.
- Root Action usage is supported starting with `v0.2.0`.
- No existing tag has been changed.
- No PR comments, PR mutation, write permissions, telemetry, secrets, AI detection, AI review, or GitHub App behavior are part of this strategy.
- v0.1.1 users should keep using `MasterProgramX/assisted-by-guard/packages/github-action@v0.1.1`.
