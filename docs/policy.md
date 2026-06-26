# Policy

Assisted-By Guard reads `.github/assisted-by.yml` by default.

The policy is explicit and deterministic. It does not attempt to infer whether AI was used. It only checks whether configured disclosure and accountability rules are present in supplied commit and file data.

## Fields

- `mode`: `permissive`, `advisory`, or `strict`.
- `require_ai_disclosure`: require an accepted disclosure trailer.
- `accepted_trailers`: trailer names that count as AI-assistance disclosure, such as `Assisted-by`.
- `forbid_ai_signed_off_by`: prevent configured tool names from appearing as DCO signers.
- `require_human_dco`: require a human `Signed-off-by` trailer.
- `require_spdx_for_new_files`: require an SPDX header near the top of new files.
- `accepted_tools`: tool names accepted by the repository disclosure policy.

When `accepted_tools` is non-empty, disclosure trailer values must name one of those configured tools. The guard does not infer tool use from broad name heuristics.

## Modes

`permissive` and `advisory` render findings as warnings and do not fail validation. `strict` renders policy findings as errors.

The default mode is `advisory`.
