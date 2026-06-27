# Release Checklist

Use this checklist before creating a release tag. Do not publish packages, create tags, push branches, or create GitHub releases until the release is explicitly approved.

## Version

- Confirm root and package versions are set to the intended release version.
- Confirm the package manager remains pnpm.
- Confirm package names, descriptions, licenses, keywords, bin fields, and package visibility are intentional.
- Confirm repository metadata points to `https://github.com/MasterProgramX/assisted-by-guard`.

## Validation

Run the release checks from a clean checkout:

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

## Action Bundle

The GitHub Action runtime is committed at `packages/github-action/dist/index.cjs` so tagged workflows can run without requiring users to install or build the workspace.

Before tagging:

- Run `pnpm check:action-bundle`.
- Confirm `packages/github-action/dist/index.cjs` matches the current TypeScript source and dependencies.
- Commit the updated bundle if source or action dependencies changed.
- Confirm root `action.yml` points to `packages/github-action/dist/index.cjs`.
- Confirm `packages/github-action/action.yml` points to `dist/index.cjs`.
- Smoke-test tagged root action usage with `MasterProgramX/assisted-by-guard@<tag>` after root Action support is released.
- Smoke-test tagged package action usage with `MasterProgramX/assisted-by-guard/packages/github-action@<tag>` for compatibility.

## Release Notes

- Update `CHANGELOG.md` for the release.
- Confirm README and docs describe current behavior without overpromising maturity.
- Confirm docs still state that Assisted-By Guard is not an AI detector and not an AI PR reviewer.
- Confirm limitations are documented, including no PR comments or mutation by default.

## npm Publishing

GitHub releases and npm publishing are separate release activities. The GitHub release flow does not publish packages to npm.

Before any future npm release, follow [`NPM_PUBLISHING.md`](NPM_PUBLISHING.md). Do not add npm tokens, registry secrets, or publish automation unless that work is explicitly approved.

## Final Git Checks

- Confirm `git status` is clean except ignored files.
- Confirm ignored generated outputs remain ignored unless they are intentionally committed release artifacts.
- Confirm no machine-specific paths, secrets, credentials, or personal files are present in public project files.
- Create the release tag only after explicit approval.
