import { readFile } from "node:fs/promises";
import * as core from "@actions/core";
import {
  defaultPolicyConfig,
  localInputErrorMessage,
  parseJsonInput,
  parsePolicyYaml,
  renderMarkdownReport,
  validateCommitsInput,
  validateNewFilesInput,
  validatePolicyConfig,
  validatePrInput,
  validatePullRequestInput,
  type CommitRecord,
  type LocalInputValidationResult,
  type LocalPrInput,
  type NewFileRecord
} from "@assisted-by-guard/core";
import { collectPullRequestEventInput, type FetchFunction } from "./github-pr.js";

interface ActionRuntime {
  getInput: (name: string) => string;
  getEnv: (name: string) => string | undefined;
  fetch: FetchFunction;
  setOutput: (name: string, value: string) => void;
  setFailed: (message: string) => void;
  warning: (message: string) => void;
  writeSummary: (markdown: string) => Promise<void>;
}

export async function runAction(runtime: ActionRuntime = githubRuntime()): Promise<void> {
  const policyPath = runtime.getInput("policy-path") || ".github/assisted-by.yml";
  const prPath = runtime.getInput("pr-json");
  const commitsPath = runtime.getInput("commits-json");
  const newFilesPath = runtime.getInput("new-files-json");
  const githubToken = runtime.getInput("github-token");

  if (prPath && (commitsPath || newFilesPath)) {
    throw new Error("Use either pr-json or commits-json/new-files-json, not both.");
  }

  const config = await loadPolicy(policyPath, runtime);
  const input = await loadInput({ prPath, commitsPath, newFilesPath, githubToken, runtime, requireSpdx: config.require_spdx_for_new_files });
  const result = validatePullRequestInput({ config, commits: input.commits, newFiles: input.newFiles });
  const report = renderMarkdownReport(result);

  runtime.setOutput("ok", String(result.ok));
  runtime.setOutput("report", report);
  await runtime.writeSummary(report);

  if (!result.ok) {
    runtime.setFailed("Assisted-By Guard policy check failed.");
  }
}

function githubRuntime(): ActionRuntime {
  return {
    getInput: (name) => core.getInput(name),
    getEnv: (name) => process.env[name],
    fetch: (url, init) => fetch(url, init),
    setOutput: (name, value) => core.setOutput(name, value),
    setFailed: (message) => core.setFailed(message),
    warning: (message) => core.warning(message),
    writeSummary: async (markdown) => {
      await core.summary.addRaw(markdown).write();
    }
  };
}

async function loadPolicy(path: string, runtime: Pick<ActionRuntime, "warning">) {
  try {
    const source = await readFile(path, "utf8");
    const result = validatePolicyConfig(parsePolicyYaml(source));

    for (const diagnostic of result.diagnostics) {
      runtime.warning(diagnostic.message);
    }

    const errors = result.diagnostics.filter((diagnostic) => diagnostic.level === "error");
    if (errors.length > 0) {
      throw new Error(`Invalid Assisted-By Guard policy: ${errors.map((item) => item.message).join(" ")}`);
    }

    return result.config;
  } catch (error) {
    const missingDefaultPolicy = isMissingFile(error) && path === ".github/assisted-by.yml";

    if (missingDefaultPolicy) {
      runtime.warning("Policy file was not found; using advisory defaults.");
      return defaultPolicyConfig;
    }

    throw error;
  }
}

async function loadInput(input: {
  prPath: string;
  commitsPath: string;
  newFilesPath: string;
  githubToken: string;
  runtime: ActionRuntime;
  requireSpdx: boolean;
}): Promise<LocalPrInput> {
  if (input.prPath) {
    return readPrFile(input.prPath);
  }

  if (input.commitsPath || input.newFilesPath) {
    return {
      commits: input.commitsPath ? await readCommitsFile(input.commitsPath) : [],
      newFiles: input.newFilesPath ? await readNewFilesFile(input.newFilesPath) : []
    };
  }

  return collectPullRequestEventInput({
    token: input.githubToken,
    eventPath: input.runtime.getEnv("GITHUB_EVENT_PATH"),
    repository: input.runtime.getEnv("GITHUB_REPOSITORY"),
    apiUrl: input.runtime.getEnv("GITHUB_API_URL"),
    fetcher: input.runtime.fetch,
    includeNewFileContents: input.requireSpdx
  });
}

async function readPrFile(path: string): Promise<LocalPrInput> {
  return unwrapLocalInputResult(validatePrInput(await readJsonFile(path, "PR JSON")));
}

async function readCommitsFile(path: string): Promise<CommitRecord[]> {
  return unwrapLocalInputResult(validateCommitsInput(await readJsonFile(path, "commits JSON")));
}

async function readNewFilesFile(path: string): Promise<NewFileRecord[]> {
  return unwrapLocalInputResult(validateNewFilesInput(await readJsonFile(path, "new files JSON")));
}

async function readJsonFile(path: string, label: string): Promise<unknown> {
  return unwrapLocalInputResult(parseJsonInput(await readFile(path, "utf8"), label));
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function unwrapLocalInputResult<T>(result: LocalInputValidationResult<T>): T {
  if (!result.ok) {
    throw new Error(localInputErrorMessage(result));
  }

  return result.value;
}
