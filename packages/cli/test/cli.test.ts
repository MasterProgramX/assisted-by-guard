import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { isCliEntrypoint, run } from "../src/index.js";

describe("CLI", () => {
  it("recognizes direct node execution by file URL", () => {
    const entrypointPath = join(tmpdir(), "assisted-by", "dist", "index.js");

    expect(isCliEntrypoint(pathToFileURL(entrypointPath).href, entrypointPath)).toBe(true);
  });

  it("creates the default policy file", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    const output: string[] = [];

    const code = await run(["init"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    const policy = await readFile(join(cwd, ".github", "assisted-by.yml"), "utf8");
    expect(code).toBe(0);
    expect(output[0]).toBe("Created .github/assisted-by.yml");
    expect(policy).toContain("mode: advisory");
  });

  it("checks a local commit message fixture", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    await writeFile(join(cwd, "commit.txt"), "Add thing\n\nSigned-off-by: Ada Lovelace <ada@example.com>\n", "utf8");
    const output: string[] = [];

    const code = await run(["check-commits", "--input", "commit.txt"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("No policy findings.");
  });

  it("fails safely when check-commits is missing explicit input", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    const output: string[] = [];

    const code = await run(["check-commits"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Expected explicit commit input");
  });

  it("fails safely when range is missing a value", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    const output: string[] = [];

    const code = await run(["check-commits", "--range"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Expected --range <git-range>.");
  });

  it("does not treat a missing range value as command help", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    const output: string[] = [];

    const code = await run(["check-commits", "--range", "--help"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Expected --range <git-range>.");
  });

  it("fails safely when range is mixed with explicit input files", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    await writeFile(join(cwd, "commit.txt"), "Add thing\n\nSigned-off-by: Ada Lovelace <ada@example.com>\n", "utf8");
    const output: string[] = [];

    const code = await run(["check-commits", "--range", "main..HEAD", "--input", "commit.txt"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Use either --range or explicit input files, not both. Mixed options: --input.");
  });

  it("fails safely when check-pr is missing explicit local data", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    const output: string[] = [];

    const code = await run(["check-pr"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Expected explicit local input for check-pr");
  });

  it("fails safely when render-comment is missing explicit local data", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    const output: string[] = [];

    const code = await run(["render-comment"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Expected explicit local input for render-comment");
  });

  it("renders useful Markdown for a valid local PR fixture", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    await writeFile(
      join(cwd, "pr.json"),
      JSON.stringify({
        commits: [
          {
            sha: "abc1234",
            message: "Add docs\n\nSigned-off-by: Ada Lovelace <ada@example.com>\nAssisted-by: GitHub Copilot"
          }
        ],
        new_files: [
          {
            path: "src/example.ts",
            content: "// SPDX-License-Identifier: MIT\nexport const example = true;\n"
          }
        ]
      }),
      "utf8"
    );
    const output: string[] = [];

    const code = await run(["render-comment", "--pr", "pr.json"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("## Assisted-By Guard Report");
    expect(output.join("\n")).toContain("| Commits checked | 1 |");
    expect(output.join("\n")).toContain("No policy findings.");
  });

  it("reports strict findings from explicit local PR data", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    await writeFile(
      join(cwd, "policy.yml"),
      `mode: strict
require_ai_disclosure: true
accepted_trailers:
  - Assisted-by
  - Generated-by
forbid_ai_signed_off_by: true
require_human_dco: true
require_spdx_for_new_files: true
accepted_tools:
  - GitHub Copilot
`,
      "utf8"
    );
    await writeFile(
      join(cwd, "pr.json"),
      JSON.stringify({
        commits: [
          {
            sha: "def5678",
            message: "Add generated helper\n\nGenerated-by: Unlisted Tool"
          }
        ],
        new_files: [
          {
            path: "src/generated-helper.ts",
            content: "export const generatedHelper = true;\n"
          }
        ]
      }),
      "utf8"
    );
    const output: string[] = [];

    const code = await run(["check-pr", "--pr", "pr.json", "--policy", "policy.yml"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    expect(code).toBe(1);
    expect(output.join("\n")).toContain("`missing-human-dco`");
    expect(output.join("\n")).toContain("`unaccepted-tool`");
    expect(output.join("\n")).toContain("`missing-spdx`");
  });

  it("fails safely when commits JSON has the wrong shape", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    await writeFile(join(cwd, "commits.json"), JSON.stringify([{ sha: "abc1234" }]), "utf8");
    const output: string[] = [];

    const code = await run(["check-commits", "--commits", "commits.json"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Invalid commits JSON");
  });

  it("fails safely when PR JSON has the wrong shape", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    await writeFile(join(cwd, "pr.json"), JSON.stringify({ commits: [{ sha: "abc1234" }] }), "utf8");
    const output: string[] = [];

    const code = await run(["render-comment", "--pr", "pr.json"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    expect(code).toBe(1);
    expect(output.join("\n")).toContain("Invalid PR JSON: commits must be an array of objects with a string message and optional string sha.");
  });

  it("fails safely when the policy is invalid", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    await mkdir(join(cwd, ".github"), { recursive: true });
    await writeFile(join(cwd, ".github", "assisted-by.yml"), "require_ai_disclosure: yes\n", "utf8");
    await writeFile(join(cwd, "commit.txt"), "Add thing\n\nSigned-off-by: Ada Lovelace <ada@example.com>\n", "utf8");
    const output: string[] = [];

    const code = await run(["check-commits", "--input", "commit.txt"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    expect(code).toBe(1);
    expect(output.join("\n")).toContain("require_ai_disclosure must be a boolean.");
  });
});
