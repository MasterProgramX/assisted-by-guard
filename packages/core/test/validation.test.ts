import { describe, expect, it } from "vitest";
import { defaultPolicyConfig } from "../src/policy.js";
import { validatePullRequestInput } from "../src/validation.js";

describe("validatePullRequestInput", () => {
  it("passes a signed and disclosed commit in strict mode", () => {
    const result = validatePullRequestInput({
      config: {
        ...defaultPolicyConfig,
        mode: "strict",
        require_ai_disclosure: true,
        accepted_tools: ["ChatGPT"]
      },
      commits: [
        {
          sha: "abc123",
          message: "Add feature\n\nSigned-off-by: Ada Lovelace <ada@example.com>\nAssisted-by: ChatGPT"
        }
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("keeps advisory findings non-blocking", () => {
    const result = validatePullRequestInput({
      config: { ...defaultPolicyConfig, require_ai_disclosure: true },
      commits: [{ message: "Add feature" }]
    });

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(2);
    expect(result.issues.every((issue) => issue.level === "warning")).toBe(true);
  });

  it("matches configured tools without broad signer-name heuristics", () => {
    const result = validatePullRequestInput({
      config: { ...defaultPolicyConfig, accepted_tools: [] },
      commits: [{ message: "Fix docs\n\nSigned-off-by: Ai Nguyen <ai@example.com>" }]
    });

    expect(result.issues).toEqual([]);
  });

  it("reports disclosure trailers that do not match configured accepted tools", () => {
    const result = validatePullRequestInput({
      config: {
        ...defaultPolicyConfig,
        require_ai_disclosure: true,
        accepted_tools: ["GitHub Copilot"]
      },
      commits: [
        {
          message: "Add feature\n\nSigned-off-by: Ada Lovelace <ada@example.com>\nAssisted-by: Unlisted Tool"
        }
      ]
    });

    expect(result.issues).toContainEqual({
      level: "warning",
      code: "unaccepted-tool",
      message: "Disclosure trailer does not match the configured accepted_tools list.",
      subject: "Add feature"
    });
  });
});
