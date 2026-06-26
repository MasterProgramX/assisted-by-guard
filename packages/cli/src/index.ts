#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
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
import { collectCommitsFromRange, collectPrInputFromRange } from "./git.js";

interface CliIo {
  cwd: string;
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

interface ParsedArgs {
  command: string[];
  options: Record<string, string | boolean>;
}

const defaultPolicyPath = ".github/assisted-by.yml";

export async function run(argv: string[], io: CliIo = defaultIo()): Promise<number> {
  const parsed = parseArgs(argv);
  const [command, subcommand] = parsed.command;

  try {
    if (!command || command === "help") {
      io.stdout(helpText());
      return 0;
    }

    if (command === "init") {
      return await initPolicy(parsed.options, io);
    }

    if (command === "check-commits") {
      const policy = await loadPolicy(parsed.options, io.cwd);
      if (!reportPolicyDiagnostics(policy, io)) {
        return 1;
      }

      const commits = await loadCommits(parsed.options, io.cwd);
      const result = validatePullRequestInput({ config: policy.config, commits });
      io.stdout(renderMarkdownReport(result));
      return result.ok ? 0 : 1;
    }

    if (command === "check-pr" || command === "render-comment") {
      if (!hasPrInput(parsed.options)) {
        throw new Error(
          `Expected explicit local input for ${command}: --range <git-range>, --pr <pr-json>, --commits <commits-json>, or --new-files <new-files-json>.`
        );
      }

      const policy = await loadPolicy(parsed.options, io.cwd);
      if (!reportPolicyDiagnostics(policy, io)) {
        return 1;
      }

      const prInput = await loadPrInput(parsed.options, io.cwd);
      const result = validatePullRequestInput({ config: policy.config, commits: prInput.commits, newFiles: prInput.newFiles });
      io.stdout(renderMarkdownReport(result));
      return result.ok ? 0 : 1;
    }

    if (command === "policy" && subcommand === "doctor") {
      const policy = await loadPolicy(parsed.options, io.cwd);
      if (policy.diagnostics.length === 0) {
        io.stdout("Policy is valid.");
        return 0;
      }

      for (const diagnostic of policy.diagnostics) {
        io.stdout(`${diagnostic.level.toUpperCase()}: ${diagnostic.message}`);
      }
      return 1;
    }

    io.stderr(`Unknown command: ${parsed.command.join(" ")}`);
    io.stderr(helpText());
    return 1;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function defaultIo(): CliIo {
  return {
    cwd: process.cwd(),
    stdout: (message) => process.stdout.write(`${message}\n`),
    stderr: (message) => process.stderr.write(`${message}\n`)
  };
}

function parseArgs(argv: string[]): ParsedArgs {
  const command: string[] = [];
  const options: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? "";

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[index + 1];

      if (!next || next.startsWith("--")) {
        options[key] = true;
      } else {
        options[key] = next;
        index += 1;
      }
    } else {
      command.push(arg);
    }
  }

  return { command, options };
}

async function initPolicy(options: Record<string, string | boolean>, io: CliIo): Promise<number> {
  const policyPath = stringOption(options, "policy") ?? defaultPolicyPath;
  const absolutePath = resolve(io.cwd, policyPath);
  const source = `mode: advisory
require_ai_disclosure: false
accepted_trailers:
  - Assisted-by
forbid_ai_signed_off_by: true
require_human_dco: true
require_spdx_for_new_files: false
accepted_tools: []
`;

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, source, "utf8");
  io.stdout(`Created ${policyPath}`);
  return 0;
}

async function loadPolicy(options: Record<string, string | boolean>, cwd: string): Promise<ReturnType<typeof validatePolicyConfig>> {
  const policyPath = stringOption(options, "policy") ?? defaultPolicyPath;
  const absolutePath = resolve(cwd, policyPath);

  try {
    const source = await readFile(absolutePath, "utf8");
    return validatePolicyConfig(parsePolicyYaml(source));
  } catch (error) {
    if (isMissingFile(error) && !hasOption(options, "policy")) {
      return { config: defaultPolicyConfig, diagnostics: [] };
    }

    throw error;
  }
}

async function loadCommits(options: Record<string, string | boolean>, cwd: string): Promise<CommitRecord[]> {
  const range = rangeOption(options);

  if (range) {
    rejectMixedRangeInputs(options, ["input", "commits"]);
    return collectCommitsFromRange(range, cwd);
  }

  const commitsPath = stringOption(options, "commits");

  if (commitsPath) {
    return readCommitsFile(resolve(cwd, commitsPath));
  }

  const inputPath = stringOption(options, "input");

  if (inputPath) {
    return [{ message: await readFile(resolve(cwd, inputPath), "utf8") }];
  }

  throw new Error("Expected explicit commit input: --range <git-range>, --input <commit-message-file>, or --commits <commits-json>.");
}

async function loadNewFiles(options: Record<string, string | boolean>, cwd: string): Promise<NewFileRecord[]> {
  const filesPath = stringOption(options, "new-files");
  return filesPath ? readNewFilesFile(resolve(cwd, filesPath)) : [];
}

async function loadPrInput(options: Record<string, string | boolean>, cwd: string): Promise<LocalPrInput> {
  const range = rangeOption(options);

  if (range) {
    rejectMixedRangeInputs(options, ["pr", "commits", "new-files"]);
    return collectPrInputFromRange(range, cwd);
  }

  const prPath = stringOption(options, "pr");

  if (prPath) {
    return readPrFile(resolve(cwd, prPath));
  }

  return {
    commits: hasOption(options, "commits") ? await loadCommits(options, cwd) : [],
    newFiles: await loadNewFiles(options, cwd)
  };
}

async function readCommitsFile(path: string): Promise<CommitRecord[]> {
  return unwrapLocalInputResult(validateCommitsInput(await readJsonFile(path, "commits JSON")));
}

async function readNewFilesFile(path: string): Promise<NewFileRecord[]> {
  return unwrapLocalInputResult(validateNewFilesInput(await readJsonFile(path, "new files JSON")));
}

async function readPrFile(path: string): Promise<LocalPrInput> {
  return unwrapLocalInputResult(validatePrInput(await readJsonFile(path, "PR JSON")));
}

async function readJsonFile(path: string, label: string): Promise<unknown> {
  return unwrapLocalInputResult(parseJsonInput(await readFile(path, "utf8"), label));
}

function stringOption(options: Record<string, string | boolean>, key: string): string | undefined {
  const value = options[key];
  return typeof value === "string" ? value : undefined;
}

function hasOption(options: Record<string, string | boolean>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(options, key);
}

function hasPrInput(options: Record<string, string | boolean>): boolean {
  return hasOption(options, "range") || hasOption(options, "pr") || hasOption(options, "commits") || hasOption(options, "new-files");
}

function reportPolicyDiagnostics(policy: ReturnType<typeof validatePolicyConfig>, io: CliIo): boolean {
  for (const diagnostic of policy.diagnostics) {
    io.stderr(`${diagnostic.level.toUpperCase()}: ${diagnostic.message}`);
  }

  return !policy.diagnostics.some((diagnostic) => diagnostic.level === "error");
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

function rangeOption(options: Record<string, string | boolean>): string | undefined {
  if (!hasOption(options, "range")) {
    return undefined;
  }

  const range = stringOption(options, "range");

  if (!range) {
    throw new Error("Expected --range <git-range>.");
  }

  return range;
}

function rejectMixedRangeInputs(options: Record<string, string | boolean>, disallowedKeys: string[]): void {
  const mixed = disallowedKeys.filter((key) => hasOption(options, key));

  if (mixed.length > 0) {
    throw new Error(`Use either --range or explicit input files, not both. Mixed options: ${mixed.map((key) => `--${key}`).join(", ")}.`);
  }
}

function helpText(): string {
  return `assisted-by

Commands:
  init [--policy <path>]
      Write a starter policy file. Defaults to .github/assisted-by.yml.

  check-commits --input <commit-message-file> [--policy <path>]
  check-commits --commits <commits-json> [--policy <path>]
  check-commits --range <git-range> [--policy <path>]
      Check explicit local commit data or local git commit messages.

  check-pr --pr <pr-json> [--policy <path>]
  check-pr --commits <commits-json> [--new-files <new-files-json>] [--policy <path>]
  check-pr --range <git-range> [--policy <path>]
      Check explicit local PR fixture data or a local git range. No GitHub API calls are made.

  policy doctor [--policy <path>]
      Validate policy syntax and option combinations.

  render-comment --pr <pr-json> [--policy <path>]
  render-comment --commits <commits-json> [--new-files <new-files-json>] [--policy <path>]
  render-comment --range <git-range> [--policy <path>]
      Render deterministic Markdown report output from local data.

Examples:
  assisted-by check-commits --input examples/fixtures/commit-message.txt
  assisted-by check-commits --range main..HEAD --policy examples/advisory-policy.yml
  assisted-by check-pr --pr examples/fixtures/pr.valid.json --policy examples/advisory-policy.yml
  assisted-by check-pr --range main..HEAD --policy examples/strict-policy.yml
  assisted-by render-comment --pr examples/fixtures/pr.strict-findings.json --policy examples/strict-policy.yml`;
}

export function isCliEntrypoint(moduleUrl: string, argvPath: string | undefined): boolean {
  return argvPath ? moduleUrl === pathToFileURL(argvPath).href : false;
}

function isEntrypoint(): boolean {
  return isCliEntrypoint(import.meta.url, process.argv[1]);
}

if (isEntrypoint()) {
  process.exitCode = await run(process.argv.slice(2));
}
