import type { ValidationResult } from "./validation.js";

export function renderMarkdownReport(result: ValidationResult): string {
  const lines: string[] = [
    "## Assisted-By Guard Report",
    "",
    `Mode: \`${result.mode}\``,
    "",
    "| Check | Result |",
    "| --- | --- |",
    `| Overall | ${result.ok ? "Pass" : "Needs attention"} |`,
    `| Commits checked | ${result.commitCount} |`,
    `| New files checked | ${result.fileCount} |`,
    `| Findings | ${result.issues.length} |`,
    ""
  ];

  if (result.issues.length === 0) {
    lines.push("No policy findings.");
    return lines.join("\n");
  }

  lines.push("### Findings", "");

  for (const item of result.issues) {
    const subject = item.subject ? ` (${item.subject})` : "";
    lines.push(`- **${item.level.toUpperCase()}** \`${item.code}\`${subject}: ${item.message}`);
  }

  return lines.join("\n");
}
