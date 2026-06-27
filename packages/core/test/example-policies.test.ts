import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parsePolicyYaml, validatePolicyConfig } from "../src/policy.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..");
const examplesDir = resolve(repoRoot, "examples");
const policyFiles = readdirSync(examplesDir)
  .filter((file) => file.endsWith(".yml"))
  .sort();

describe("example policies", () => {
  it("finds checked-in policy examples", () => {
    expect(policyFiles.length).toBeGreaterThan(0);
  });

  it.each(policyFiles)("%s validates without diagnostics", (file) => {
    const source = readFileSync(resolve(examplesDir, file), "utf8");
    const result = validatePolicyConfig(parsePolicyYaml(source));

    expect(result.diagnostics).toEqual([]);
  });
});
