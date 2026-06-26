import { readFile } from "node:fs/promises";
import * as core from "@actions/core";
import {
  defaultPolicyConfig,
  parsePolicyYaml,
  renderMarkdownReport,
  validatePolicyConfig,
  validatePullRequestInput,
  type CommitRecord,
  type NewFileRecord
} from "@assisted-by-guard/core";

export async function runAction(): Promise<void> {
  const policyPath = core.getInput("policy-path") || ".github/assisted-by.yml";
  const commitsPath = core.getInput("commits-json");
  const newFilesPath = core.getInput("new-files-json");

  if (!commitsPath && !newFilesPath) {
    throw new Error("Expected commits-json or new-files-json input for the MVP action wrapper.");
  }

  const config = await loadPolicy(policyPath);
  const commits = commitsPath ? await readJsonFile<CommitRecord[]>(commitsPath) : [];
  const newFiles = newFilesPath ? await readJsonFile<NewFileRecord[]>(newFilesPath) : [];
  const result = validatePullRequestInput({ config, commits, newFiles });
  const report = renderMarkdownReport(result);

  core.setOutput("ok", String(result.ok));
  core.setOutput("report", report);
  await core.summary.addRaw(report).write();

  if (!result.ok) {
    core.setFailed("Assisted-By Guard policy check failed.");
  }
}

async function loadPolicy(path: string) {
  try {
    const source = await readFile(path, "utf8");
    const result = validatePolicyConfig(parsePolicyYaml(source));

    for (const diagnostic of result.diagnostics) {
      core.warning(diagnostic.message);
    }

    const errors = result.diagnostics.filter((diagnostic) => diagnostic.level === "error");
    if (errors.length > 0) {
      throw new Error(`Invalid Assisted-By Guard policy: ${errors.map((item) => item.message).join(" ")}`);
    }

    return result.config;
  } catch (error) {
    const missingDefaultPolicy = isMissingFile(error) && path === ".github/assisted-by.yml";

    if (missingDefaultPolicy) {
      core.warning("Policy file was not found; using advisory defaults.");
      return defaultPolicyConfig;
    }

    throw error;
  }
}

async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

runAction().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
