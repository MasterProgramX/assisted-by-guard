# GitHub Action Distribution Strategy

Assisted-By Guard currently publishes its GitHub Action from the workspace package directory:

```yaml
uses: MasterProgramX/assisted-by-guard/packages/github-action@v0.1.1
```

This is the supported v0.1.x usage path. No root Action entrypoint has been added yet.

## Current Layout

The repository is a pnpm TypeScript workspace:

- `packages/core`: deterministic policy, trailer, SPDX, local input, and report logic.
- `packages/cli`: local CLI for explicit inputs and local git ranges.
- `packages/github-action`: JavaScript Action wrapper and committed runtime bundle.

The Action package lives under `packages/github-action` so the CLI, core library, and Action can share one release process while keeping ownership boundaries clear. The committed Action runtime is `packages/github-action/dist/index.cjs`, and `packages/github-action/action.yml` points to that bundle.

GitHub Actions supports public actions from a repository subdirectory with the syntax `{owner}/{repo}/{path}@{ref}`. GitHub Marketplace, however, expects a public repository with a single root `action.yml` or `action.yaml` metadata file for automatic listing; subfolder metadata files may exist but are not automatically listed.

References:

- GitHub workflow syntax for public actions and subdirectory actions: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepsuses
- GitHub action metadata syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax
- GitHub Marketplace action publishing requirements: https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace

## Strategy Options

| Option | User experience | Marketplace compatibility | Maintenance burden | Monorepo cleanliness | Release complexity | v0.1.1 compatibility | Risk | CLI/core organization |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A - Keep current subpath Action | Current users keep `MasterProgramX/assisted-by-guard/packages/github-action@v0.1.1`; discoverability is less obvious than root usage. | Weak for Marketplace because the metadata file is not at the repository root. | Low. Existing bundle and tests stay as-is. | Strong. Workspace package boundaries stay clear. | Low. Current release checklist already covers the package bundle. | Full compatibility. | Low. No migration. | Strong. |
| B - Add a root `action.yml` wrapper | Future users could use `MasterProgramX/assisted-by-guard@v0.2.0`; current subpath can remain supported. | Stronger, because the repository root would expose Action metadata. | Medium. Root metadata and package metadata must stay aligned. | Good if the root file is a thin wrapper to `packages/github-action/dist/index.cjs`. | Medium. Release smoke tests must cover both root and subpath usage during transition. | Compatible if the subpath remains documented and tested. | Medium. A bad wrapper could break first-run trust. | Strong if implementation remains a wrapper. |
| C - Move the Action package to the repo root | Root usage becomes natural, but the repository becomes Action-first. | Strong. | Medium to high. Build, package, docs, and workspace paths all move. | Weaker. CLI and core package organization becomes less obvious. | High. Many docs and tests would need updates. | Compatible only if the old subpath is preserved or clearly migrated. | High for little immediate benefit. | Weaker. |
| D - Create a separate action-only repository | Clean Action consumer path such as `MasterProgramX/assisted-by-guard-action@v1`. | Strong for Marketplace. | High. Requires another repository, sync process, release coordination, and support surface. | Strong in this repo, but split ownership elsewhere. | High. Two repositories need coordinated release and smoke testing. | Compatible if current subpath remains. | Medium to high. More places to drift. | Strong here, weaker cross-repo. |

## Recommendation

Keep Option A for v0.1.x and explore Option B for v0.2.0.

Do not move the Action package to the repository root yet. Do not create a separate action-only repository yet. The current packaged subpath is valid, tested, and already released. A root wrapper is the smallest likely improvement for discoverability and possible Marketplace readiness because it can preserve the workspace layout and keep `packages/core`, `packages/cli`, and `packages/github-action` organized.

## Possible v0.2.0 Migration Plan

Before adopting a root Action:

1. Add a root `action.yml` that mirrors the current inputs and outputs.
2. Point the root metadata to the committed package bundle, likely `packages/github-action/dist/index.cjs`.
3. Keep `packages/github-action/action.yml` for compatibility unless there is a documented reason to remove it.
4. Add smoke tests for both paths:

   ```yaml
   uses: MasterProgramX/assisted-by-guard@v0.2.0
   ```

   ```yaml
   uses: MasterProgramX/assisted-by-guard/packages/github-action@v0.2.0
   ```

5. Update README, `docs/github-action.md`, and release notes only after the root path is actually implemented and tested.
6. Keep permissions read-only in examples:

   ```yaml
   permissions:
     contents: read
     pull-requests: read
   ```

7. Smoke-test the tagged root path before any release announcement.

## Current Non-Goals

- No Marketplace listing has been created.
- No root Action usage is currently supported.
- No existing tag has been changed.
- No PR comments, PR mutation, write permissions, telemetry, secrets, AI detection, AI review, or GitHub App behavior are part of this strategy.
- v0.1.1 users should keep using `MasterProgramX/assisted-by-guard/packages/github-action@v0.1.1`.
