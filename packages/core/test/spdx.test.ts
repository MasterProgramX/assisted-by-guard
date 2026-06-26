import { describe, expect, it } from "vitest";
import { defaultPolicyConfig } from "../src/policy.js";
import { hasSpdxHeader, validateNewFileSpdx } from "../src/spdx.js";

describe("SPDX validation", () => {
  it("detects SPDX headers near the top of a file", () => {
    expect(hasSpdxHeader("// SPDX-License-Identifier: MIT\nexport {};")).toBe(true);
  });

  it("reports new files without SPDX headers when required", () => {
    const issues = validateNewFileSpdx(
      [{ path: "src/index.ts", content: "export {};" }],
      { ...defaultPolicyConfig, require_spdx_for_new_files: true }
    );

    expect(issues).toEqual([
      {
        path: "src/index.ts",
        message: "New file is missing an SPDX-License-Identifier header."
      }
    ]);
  });
});
