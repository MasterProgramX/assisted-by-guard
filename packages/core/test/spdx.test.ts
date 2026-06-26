import { describe, expect, it } from "vitest";
import { defaultPolicyConfig } from "../src/policy.js";
import { hasSpdxHeader, shouldRequireSpdx, validateNewFileSpdx } from "../src/spdx.js";

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
        message: "New source file is missing an SPDX-License-Identifier header."
      }
    ]);
  });

  it("only requires SPDX headers for source-like files", () => {
    expect(shouldRequireSpdx("src/index.ts")).toBe(true);
    expect(shouldRequireSpdx("docs/overview.md")).toBe(false);

    const issues = validateNewFileSpdx(
      [{ path: "docs/overview.md", content: "Project notes" }],
      { ...defaultPolicyConfig, require_spdx_for_new_files: true }
    );

    expect(issues).toEqual([]);
  });
});
