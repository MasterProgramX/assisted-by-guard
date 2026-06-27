# DCO And AI Contributions

Assisted-By Guard uses deterministic checks to help maintainers apply repository disclosure policy. It does not infer whether AI was used and does not accuse contributors.

## Human DCO Sign-Off

DCO-style sign-off represents human accountability. Use a human signer in `Name <email>` form:

```text
Signed-off-by: Ada Lovelace <ada@example.com>
```

AI tools must not be listed as `Signed-off-by` signers.

## Assisted-By Trailers

When AI assistance is material to a contribution, disclose it with an accepted trailer:

```text
Assisted-by: GitHub Copilot
```

The repository policy decides whether disclosure is advisory or required. This repository currently dogfoods Assisted-By Guard in advisory mode so maintainers can see findings without blocking early project work.

## Review Expectations

Maintainers review the contribution, tests, and policy findings. The tool does not review code quality, determine authorship, or replace maintainer judgment.
