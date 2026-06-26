import { describe, expect, it } from "vitest";
import { parsePolicyYaml, validatePolicyConfig } from "../src/policy.js";

describe("validatePolicyConfig", () => {
  it("accepts a valid policy", () => {
    const result = validatePolicyConfig(
      parsePolicyYaml(`mode: strict
require_ai_disclosure: true
accepted_trailers:
  - Assisted-by
  - Generated-by
forbid_ai_signed_off_by: true
require_human_dco: true
require_spdx_for_new_files: true
accepted_tools:
  - ChatGPT
`)
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.config.mode).toBe("strict");
    expect(result.config.accepted_trailers).toEqual(["Assisted-by", "Generated-by"]);
  });

  it("reports invalid field types and falls back to safe defaults", () => {
    const result = validatePolicyConfig({ mode: "enforced", require_human_dco: "yes" });

    expect(result.diagnostics.map((item) => item.level)).toEqual(["error", "error"]);
    expect(result.config.mode).toBe("advisory");
    expect(result.config.require_human_dco).toBe(true);
  });

  it("rejects policies that require disclosure without any accepted trailer", () => {
    const result = validatePolicyConfig({
      require_ai_disclosure: true,
      accepted_trailers: []
    });

    expect(result.diagnostics).toContainEqual({
      level: "error",
      message: "accepted_trailers must contain at least one trailer when require_ai_disclosure is true."
    });
  });

  it("warns when disclosure is required but tool names cannot be validated", () => {
    const result = validatePolicyConfig({
      require_ai_disclosure: true,
      accepted_trailers: ["Assisted-by"],
      accepted_tools: []
    });

    expect(result.diagnostics).toContainEqual({
      level: "warning",
      message: "accepted_tools is empty; disclosure trailers will be checked for presence but tool names cannot be validated."
    });
  });
});
