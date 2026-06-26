# Policy

Assisted-By Guard reads `.github/assisted-by.yml` by default.

The policy is explicit and deterministic. It does not attempt to infer whether AI was used. It only checks whether configured disclosure and accountability rules are present in supplied commit and file data.

## Fields

- `mode`: `permissive`, `advisory`, or `strict`.
- `require_ai_disclosure`: require an accepted disclosure trailer.
- `accepted_trailers`: trailer names that count as AI-assistance disclosure, such as `Assisted-by`.
- `forbid_ai_signed_off_by`: prevent configured tool names from appearing as DCO signers.
- `require_human_dco`: require a human `Signed-off-by` trailer in `Name <email>` form.
- `require_spdx_for_new_files`: require an SPDX header near the top of new source files.
- `accepted_tools`: tool names accepted by the repository disclosure policy.

When `accepted_tools` is non-empty, disclosure trailer values must name one of those configured tools. The guard does not infer tool use from broad name heuristics. Tool-name matching is explicit and boundary-aware, so an accepted tool name does not match arbitrary longer words.

If `require_ai_disclosure` is true while `accepted_tools` is empty, Assisted-By Guard can check that a disclosure trailer exists, but it cannot validate the disclosed tool name.

SPDX checks are deterministic and limited to source-like file extensions in the current MVP. Documentation and other non-source files are not required to carry SPDX headers by this rule.

## Modes

`permissive` and `advisory` render findings as warnings and do not fail validation. `strict` renders policy findings as errors.

The default mode is `advisory`.
