# npm Publishing

Assisted-By Guard publishes the CLI and core packages to npm manually. This document records the current package strategy and the checklist for future npm releases. It does not add tokens, secrets, registry automation, or package publishing workflows.

## Current Status

- Published packages:
  - `assisted-by-guard`
  - `@assisted-by-guard/core`
- Current npm version: `0.2.0`
- CLI install:

  ```sh
  npm install -g assisted-by-guard
  assisted-by --help
  ```

- GitHub releases exist.
- The GitHub Action is consumed from `MasterProgramX/assisted-by-guard@v0.2.0`.
- The compatibility subpath Action remains available at `MasterProgramX/assisted-by-guard/packages/github-action@v0.2.0`.
- No npm token, registry secret, or publish automation exists.
- The root workspace package is private and unpublished.
- The GitHub Action package is private and unpublished.
- The first npm publish was manual.

## Package Strategy

- `assisted-by-guard`: public CLI package from `packages/cli`.
- `@assisted-by-guard/core`: public reusable validation library from `packages/core`.
- `@assisted-by-guard/github-action`: keep private and unpublished.
- `assisted-by-guard-workspace`: keep private and unpublished.

This matches the current architecture: the CLI package depends on the core package, while the GitHub Action is distributed through GitHub release tags and its committed bundle.

## Strategy Options

| Option | User experience | Maintenance burden | Versioning complexity | Workspace fit | Risk |
| --- | --- | --- | --- | --- | --- |
| A - Publish only the CLI package | Users install `assisted-by-guard`, but the CLI still needs core code. This would require bundling core or changing dependencies. | Medium. Bundling must stay correct. | Medium. CLI and bundled core can drift from library source. | Weaker than the current package boundary. | Risk of hiding core compatibility issues. |
| B - Publish CLI and core packages | Users install `assisted-by-guard`; the CLI depends on `@assisted-by-guard/core`. Core is also available for integrations. | Moderate and explicit. | Clear if both packages share the same version for early releases. | Strong. Matches the current workspace design. | Lowest practical risk if publish dry-runs are reviewed. |
| C - Publish nothing for now | No npm maintenance yet. Users keep using source checkout and the GitHub Action. | Low. | None. | Fine for v0.1.x. | Limits CLI discoverability and installability. |

Chosen path: Option B. Keep the root workspace and GitHub Action package unpublished.

## Package Audit

### `packages/cli`

- Name: `assisted-by-guard`
- Publish intent: public.
- Binary: `assisted-by` points to `./dist/index.js`.
- Package contents: `files` is limited to `dist`.
- Dependencies: `@assisted-by-guard/core` uses the workspace protocol in the repo.
- Before publishing, verify the packed manifest resolves the workspace dependency to a registry version. Use `pnpm publish --access public`, not plain `npm publish`, so the workspace dependency is rewritten correctly.

### `packages/core`

- Name: `@assisted-by-guard/core`
- Publish intent: public.
- Package contents: `files` is limited to `dist`.
- Exports: package root exposes ESM build and types.
- Runtime dependency: `yaml`.

### `packages/github-action`

- Name: `@assisted-by-guard/github-action`
- Publish intent: unpublished.
- Keep `private: true`.
- The Action is distributed by GitHub tag, not npm.

### Root package

- Name: `assisted-by-guard-workspace`
- Publish intent: unpublished.
- Keep `private: true`.
- Keep `packageManager` set to pnpm.

## Pre-Publish Checklist

Run these checks before any npm release:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm lint
pnpm check:action-bundle
git diff --check
node packages/cli/dist/index.js policy doctor --policy .github/assisted-by.yml
git status --short
git status --ignored
```

Then inspect package metadata:

- Confirm versions match the intended npm release.
- Confirm `packages/cli/package.json` has the intended `name`, `description`, `license`, `repository`, `bin`, `files`, `exports`, `main`, `types`, and `engines`.
- Confirm `packages/core/package.json` has the intended `name`, `description`, `license`, `repository`, `files`, `exports`, `main`, `types`, `engines`, and dependencies.
- Confirm `packages/github-action/package.json` remains `private: true`.
- Confirm the root package remains `private: true`.
- Confirm no package tarballs are present in the working tree.
- Confirm no tokens, secrets, or registry automation are added.

## Dry-Run Checklist

Use dry-runs before publishing.

```sh
cd packages/core
pnpm publish --dry-run --access public

cd ../cli
pnpm publish --dry-run --access public
```

Review the output for both packages:

- Only intended `dist` files and `package.json` should be included.
- CLI package should include `dist/index.js` for the `assisted-by` binary.
- Type declarations and source maps should be intentional.
- The CLI dependency on `@assisted-by-guard/core` must resolve to the intended published version before the real publish.

If a dry-run creates any `.tgz` file, delete it before committing. Do not commit package tarballs.

## Account And 2FA Considerations

Before a real publish:

- Use an npm account controlled by the maintainer or project.
- Enable two-factor authentication according to the npm account policy.
- Prefer manual publishing until registry automation is explicitly designed and approved.
- Do not add `NPM_TOKEN`, registry secrets, or publish workflows until automation is explicitly approved.
- Confirm package names are available on npm before announcing them.

## Publish Order

1. Publish `@assisted-by-guard/core`.
2. Verify the package page and install metadata.
3. Publish `assisted-by-guard`.
4. Verify `npx --no-install assisted-by --help` or equivalent local install behavior in a clean temporary project.
5. Update docs to say npm packages are published only after the packages are actually available.

Do not publish `@assisted-by-guard/github-action`. Do not publish the root workspace package.

## Rollback And Unpublish Caution

Package unpublishing has registry policy limits and can disrupt users. Treat publish operations as hard to undo:

- Prefer a patch release over unpublishing for mistakes.
- Do not publish from a dirty working tree.
- Do not publish unreviewed package contents.
- Do not publish with placeholder metadata or unresolved workspace dependencies.

## References

- npm publish command: https://docs.npmjs.com/cli/v10/commands/npm-publish
- npm package.json fields: https://docs.npmjs.com/cli/v10/configuring-npm/package-json
- pnpm publish command: https://pnpm.io/cli/publish
- pnpm workspaces and workspace protocol: https://pnpm.io/workspaces
