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

  it("reports invalid human DCO signer data without accusing contributors", () => {
    const result = validatePullRequestInput({
      config: { ...defaultPolicyConfig, mode: "strict" },
      commits: [{ message: "Fix docs\n\nSigned-off-by: Ada Lovelace" }]
    });

    expect(result.issues).toEqual([
      {
        level: "error",
        code: "invalid-human-dco",
        message: "Signed-off-by must identify an accountable human in Name <email> form.",
        subject: "Fix docs"
      }
    ]);
  });

  it("forbids configured tool names from signing DCO without broad heuristics", () => {
    const result = validatePullRequestInput({
      config: {
        ...defaultPolicyConfig,
        accepted_tools: ["ChatGPT"]
      },
      commits: [
        {
          message: "Fix docs\n\nSigned-off-by: ChatGPT <tool@example.com>"
        },
        {
          message: "Fix follow-up\n\nSigned-off-by: NotChatGPT <person@example.com>"
        }
      ]
    });

    expect(result.issues).toContainEqual({
      level: "warning",
      code: "invalid-human-dco",
      message: "Signed-off-by must identify an accountable human in Name <email> form.",
      subject: "Fix docs"
    });
    expect(result.issues).toContainEqual({
      level: "warning",
      code: "ai-signed-off-by",
      message: "Signed-off-by must identify an accountable human, not an AI tool.",
      subject: "Fix docs"
    });
    expect(result.issues.some((issue) => issue.subject === "Fix follow-up")).toBe(false);
  });

  it("reports each unaccepted disclosure trailer when accepted tools are configured", () => {
    const result = validatePullRequestInput({
      config: {
        ...defaultPolicyConfig,
        accepted_trailers: ["Assisted-by", "Generated-by"],
        accepted_tools: ["GitHub Copilot"]
      },
      commits: [
        {
          message:
            "Add feature\n\nSigned-off-by: Ada Lovelace <ada@example.com>\nAssisted-by: GitHub Copilot\nGenerated-by: Unlisted Tool"
        }
      ]
    });

    expect(result.issues).toEqual([
      {
        level: "warning",
        code: "unaccepted-tool",
        message: "Disclosure trailer does not match the configured accepted_tools list.",
        subject: "Add feature"
      }
    ]);
  });
});
