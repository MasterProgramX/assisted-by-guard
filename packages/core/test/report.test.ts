import { describe, expect, it } from "vitest";
import { renderMarkdownReport } from "../src/report.js";
import type { ValidationResult } from "../src/validation.js";

describe("renderMarkdownReport", () => {
  it("renders a compact passing report", () => {
    const report = renderMarkdownReport({
      ok: true,
      mode: "advisory",
      issues: [],
      commitCount: 1,
      fileCount: 0
    });

    expect(report).toContain("Assisted-By Guard Report");
    expect(report).toContain("No policy findings.");
  });

  it("renders findings with severity and subject", () => {
    const result: ValidationResult = {
      ok: false,
      mode: "strict",
      commitCount: 1,
      fileCount: 0,
      issues: [
        {
          level: "error",
          code: "missing-human-dco",
          message: "Commit is missing a human Signed-off-by trailer.",
          subject: "abc123"
        }
      ]
    };

    expect(renderMarkdownReport(result)).toContain("**ERROR** `missing-human-dco` (abc123)");
  });
});
