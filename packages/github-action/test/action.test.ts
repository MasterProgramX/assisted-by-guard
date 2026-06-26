import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runAction } from "../src/index.js";

interface TestRuntime {
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  warnings: string[];
  failures: string[];
  summary: string;
}

describe("runAction", () => {
  it("renders a report from a valid local PR fixture", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-action-"));
    const prPath = join(cwd, "pr.json");
    await writeFile(
      prPath,
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
    const runtime = createRuntime({ "pr-json": prPath });

    await runAction(runtime);

    expect(runtime.outputs.ok).toBe("true");
    expect(runtime.outputs.report).toContain("Assisted-By Guard Report");
    expect(runtime.summary).toContain("No policy findings.");
    expect(runtime.failures).toEqual([]);
  });

  it("requires explicit local input", async () => {
    const runtime = createRuntime({});

    await expect(runAction(runtime)).rejects.toThrow("Expected explicit local input");
  });

  it("rejects mixed PR and split input modes", async () => {
    const runtime = createRuntime({
      "pr-json": "pr.json",
      "commits-json": "commits.json"
    });

    await expect(runAction(runtime)).rejects.toThrow("Use either pr-json or commits-json/new-files-json, not both.");
  });

  it("rejects invalid PR fixture shape", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-action-"));
    const prPath = join(cwd, "pr.json");
    await writeFile(prPath, JSON.stringify({ commits: [{ sha: "abc1234" }] }), "utf8");
    const runtime = createRuntime({ "pr-json": prPath });

    await expect(runAction(runtime)).rejects.toThrow("Invalid PR JSON: commits must be an array of objects with a string message and optional string sha.");
  });

  it("rejects invalid commits fixture shape", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-action-"));
    const commitsPath = join(cwd, "commits.json");
    await writeFile(commitsPath, JSON.stringify([{ sha: "abc1234" }]), "utf8");
    const runtime = createRuntime({ "commits-json": commitsPath });

    await expect(runAction(runtime)).rejects.toThrow("Invalid commits JSON: expected an array of objects with a string message and optional string sha.");
  });
});

function createRuntime(inputs: Record<string, string>): Parameters<typeof runAction>[0] & TestRuntime {
  const runtime = {
    inputs,
    outputs: {},
    warnings: [],
    failures: [],
    summary: "",
    getInput: (name: string) => runtime.inputs[name] ?? "",
    setOutput: (name: string, value: string) => {
      runtime.outputs[name] = value;
    },
    setFailed: (message: string) => {
      runtime.failures.push(message);
    },
    warning: (message: string) => {
      runtime.warnings.push(message);
    },
    writeSummary: async (markdown: string) => {
      runtime.summary = markdown;
    }
  };

  return runtime;
}
