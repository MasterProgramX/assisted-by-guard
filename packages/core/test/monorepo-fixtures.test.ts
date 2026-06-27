import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  parseJsonInput,
  validateCommitsInput,
  validateNewFilesInput,
  validatePrInput
} from "../src/local-input.js";
import { parsePolicyYaml, validatePolicyConfig } from "../src/policy.js";
import { validatePullRequestInput } from "../src/validation.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..");
const fixtureDir = resolve(repoRoot, "examples/fixtures/monorepo");

describe("monorepo fixtures", () => {
  it("validates the split local input files", () => {
    const commits = parseFixtureJson("commits.valid.json", "commits JSON");
    const newFiles = parseFixtureJson("new-files.mixed.json", "new files JSON");

    const commitsResult = validateCommitsInput(commits);
    const newFilesResult = validateNewFilesInput(newFiles);

    expect(commitsResult.ok).toBe(true);
    expect(newFilesResult.ok).toBe(true);
  });

  it("validates the combined PR fixture", () => {
    const pr = parseFixtureJson("pr.strict-findings.json", "PR JSON");
    const prResult = validatePrInput(pr);

    expect(prResult.ok).toBe(true);
    expect(prResult.ok ? prResult.value.commits : []).toHaveLength(2);
    expect(prResult.ok ? prResult.value.newFiles : []).toHaveLength(4);
  });

  it("reports only the source-like monorepo file missing an SPDX header", () => {
    const pr = validatePrInput(parseFixtureJson("pr.strict-findings.json", "PR JSON"));
    const policy = validatePolicyConfig(
      parsePolicyYaml(readFileSync(resolve(repoRoot, "examples/security-sensitive-policy.yml"), "utf8"))
    );

    expect(pr.ok).toBe(true);
    expect(policy.diagnostics).toEqual([]);

    if (!pr.ok) {
      throw new Error("Monorepo PR fixture failed schema validation.");
    }

    const result = validatePullRequestInput({
      config: policy.config,
      commits: pr.value.commits,
      newFiles: pr.value.newFiles
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      {
        level: "error",
        code: "missing-spdx",
        message: "New source file is missing an SPDX-License-Identifier header.",
        subject: "packages/api/src/server.ts"
      }
    ]);
  });
});

function parseFixtureJson(file: string, label: string): unknown {
  const source = readFileSync(resolve(fixtureDir, file), "utf8");
  const result = parseJsonInput(source, label);

  if (!result.ok) {
    throw new Error(result.diagnostics.map((diagnostic) => diagnostic.message).join(" "));
  }

  return result.value;
}
