import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("action metadata", () => {
  it("keeps the root wrapper aligned with the package action", async () => {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
    const rootAction = parseActionMetadata(await readFile(resolve(repoRoot, "action.yml"), "utf8"));
    const packageAction = parseActionMetadata(await readFile(resolve(repoRoot, "packages/github-action/action.yml"), "utf8"));

    expect(rootAction.inputs).toEqual(packageAction.inputs);
    expect(rootAction.outputs).toEqual(packageAction.outputs);
    expect(rootAction.runs.using).toBe(packageAction.runs.using);
    expect(rootAction.runs.using).toBe("node24");
    expect(rootAction.runs.main).toBe("packages/github-action/dist/index.cjs");
    expect(packageAction.runs.main).toBe("dist/index.cjs");

    const bundle = await stat(resolve(repoRoot, rootAction.runs.main));
    expect(bundle.isFile()).toBe(true);
  });
});

interface ActionMetadataSummary {
  inputs: string[];
  outputs: string[];
  runs: {
    using: string;
    main: string;
  };
}

function parseActionMetadata(text: string): ActionMetadataSummary {
  const summary: ActionMetadataSummary = {
    inputs: [],
    outputs: [],
    runs: {
      using: "",
      main: ""
    }
  };
  let section: "inputs" | "outputs" | "runs" | undefined;

  for (const line of text.split(/\r?\n/)) {
    const topLevel = /^([A-Za-z_-]+):/.exec(line);

    if (topLevel) {
      section = topLevel[1] === "inputs" || topLevel[1] === "outputs" || topLevel[1] === "runs" ? topLevel[1] : undefined;
      continue;
    }

    if (section === "inputs" || section === "outputs") {
      const key = /^[ ]{2}([A-Za-z0-9_-]+):/.exec(line);
      if (key) {
        summary[section].push(key[1]);
      }
      continue;
    }

    if (section === "runs") {
      const field = /^[ ]{2}(using|main):\s*"?([^"]+)"?/.exec(line);
      if (field) {
        summary.runs[field[1] as "using" | "main"] = field[2];
      }
    }
  }

  return summary;
}
