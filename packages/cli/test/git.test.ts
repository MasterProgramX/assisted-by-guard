import { describe, expect, it } from "vitest";
import {
  collectCommitsFromRange,
  collectNewFilesFromRange,
  collectPrInputFromRange,
  gitLogArgs,
  gitNewFilesArgs,
  parseGitLogOutput,
  parseGitNewFilesOutput,
  rangeEndRef,
  assertSafeRange,
  type GitExecutor
} from "../src/git.js";

describe("local git collection", () => {
  it("builds git commands as argument arrays", () => {
    expect(gitLogArgs("main..HEAD")).toEqual(["log", "--format=%x1e%H%x00%B", "main..HEAD"]);
    expect(gitNewFilesArgs("main..HEAD")).toEqual(["diff", "--name-only", "--diff-filter=A", "-z", "main..HEAD"]);
  });

  it("parses commit messages from git log output", () => {
    const output = "\x1eabc123\x00Add docs\n\nSigned-off-by: Ada Lovelace <ada@example.com>\n\x1edef456\x00Fix tests";

    expect(parseGitLogOutput(output)).toEqual([
      {
        sha: "abc123",
        message: "Add docs\n\nSigned-off-by: Ada Lovelace <ada@example.com>"
      },
      {
        sha: "def456",
        message: "Fix tests"
      }
    ]);
  });

  it("parses new file paths from NUL-delimited git diff output", () => {
    expect(parseGitNewFilesOutput("src/index.ts\x00docs/readme.md\x00")).toEqual([{ path: "src/index.ts" }, { path: "docs/readme.md" }]);
  });

  it("selects the right side of explicit git ranges", () => {
    expect(rangeEndRef("main..HEAD")).toBe("HEAD");
    expect(rangeEndRef("origin/main...feature")).toBe("feature");
    expect(rangeEndRef("HEAD")).toBe("HEAD");
  });

  it("rejects empty or option-like git ranges", () => {
    expect(() => assertSafeRange("")).toThrow("Expected --range <git-range>.");
    expect(() => assertSafeRange("--help")).toThrow("Invalid git range: range must be a revision expression, not an option.");
    expect(() => rangeEndRef("main..")).toThrow("Invalid git range: range must include a right-side revision.");
  });

  it("collects commits using the provided executor", async () => {
    const executor = recordingExecutor([["log", "\x1eabc123\x00Add docs"]]);

    await expect(collectCommitsFromRange("main..HEAD", "/repo", executor)).resolves.toEqual([
      {
        sha: "abc123",
        message: "Add docs"
      }
    ]);
    expect(executor.calls).toEqual([{ args: gitLogArgs("main..HEAD"), cwd: "/repo" }]);
  });

  it("collects new file contents from the range end ref", async () => {
    const executor = recordingExecutor([
      ["diff", "src/index.ts\x00"],
      ["show", "export const value = true;\n"]
    ]);

    await expect(collectNewFilesFromRange("main..HEAD", "/repo", executor)).resolves.toEqual([
      {
        path: "src/index.ts",
        content: "export const value = true;\n"
      }
    ]);
    expect(executor.calls).toEqual([
      { args: gitNewFilesArgs("main..HEAD"), cwd: "/repo" },
      { args: ["show", "HEAD:src/index.ts"], cwd: "/repo" }
    ]);
  });

  it("collects commits and new files for PR-like validation", async () => {
    const executor = recordingExecutor([
      ["log", "\x1eabc123\x00Add docs"],
      ["diff", "src/index.ts\x00"],
      ["show", "export const value = true;\n"]
    ]);

    await expect(collectPrInputFromRange("main..HEAD", "/repo", executor)).resolves.toEqual({
      commits: [{ sha: "abc123", message: "Add docs" }],
      newFiles: [{ path: "src/index.ts", content: "export const value = true;\n" }]
    });
  });
});

interface RecordingExecutor extends GitExecutor {
  calls: Array<{ args: string[]; cwd: string }>;
}

function recordingExecutor(responses: Array<[command: string, output: string]>): RecordingExecutor {
  const calls: Array<{ args: string[]; cwd: string }> = [];

  return {
    calls,
    run: async (args, cwd) => {
      calls.push({ args, cwd });
      const response = responses.shift();

      if (!response || response[0] !== args[0]) {
        throw new Error(`Unexpected git command: ${args.join(" ")}`);
      }

      return response[1];
    }
  };
}
