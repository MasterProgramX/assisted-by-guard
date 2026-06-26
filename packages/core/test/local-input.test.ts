import { describe, expect, it } from "vitest";
import { localInputErrorMessage, parseJsonInput, validateCommitsInput, validateNewFilesInput, validatePrInput } from "../src/local-input.js";

describe("local input schema", () => {
  it("validates PR input with commits and new_files", () => {
    const result = validatePrInput({
      commits: [
        {
          sha: "abc1234",
          message: "Add docs\n\nSigned-off-by: Ada Lovelace <ada@example.com>"
        }
      ],
      new_files: [
        {
          path: "src/example.ts",
          content: "// SPDX-License-Identifier: MIT\nexport {};\n"
        }
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.value.newFiles[0]?.path : undefined).toBe("src/example.ts");
  });

  it("reports invalid PR input deterministically", () => {
    const result = validatePrInput({ commits: [{ sha: "abc1234" }] });

    expect(result).toEqual({
      ok: false,
      diagnostics: [
        {
          level: "error",
          message: "Invalid PR JSON: commits must be an array of objects with a string message and optional string sha."
        }
      ]
    });
  });

  it("validates commit input arrays", () => {
    const result = validateCommitsInput([{ message: "Add docs" }]);

    expect(result.ok).toBe(true);
  });

  it("validates new file input arrays", () => {
    const result = validateNewFilesInput([{ path: "src/index.ts", content: "export {};" }]);

    expect(result.ok).toBe(true);
  });

  it("reports JSON syntax errors with the caller-provided label", () => {
    const result = parseJsonInput("{", "PR JSON");

    expect(localInputErrorMessage(result)).toBe("Invalid PR JSON: file is not valid JSON.");
  });
});
