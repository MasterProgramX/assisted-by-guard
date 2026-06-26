#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  defaultPolicyConfig,
  parsePolicyYaml,
  renderMarkdownReport,
  validatePolicyConfig,
  validatePullRequestInput,
  type CommitRecord,
  type NewFileRecord
} from "@assisted-by-guard/core";

interface CliIo {
  cwd: string;
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

interface ParsedArgs {
  command: string[];
  options: Record<string, string | boolean>;
}

interface LocalPrInput {
  commits: CommitRecord[];
  newFiles: NewFileRecord[];
}

const defaultPolicyPath = ".github/assisted-by.yml";

export async function run(argv: string[], io: CliIo = defaultIo()): Promise<number> {
  const parsed = parseArgs(argv);
  const [command, subcommand] = parsed.command;

  try {
    if (!command || command === "help" || parsed.options.help) {
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
        throw new Error(`Expected explicit local input for ${command}: --pr <pr-json>, --commits <commits-json>, or --new-files <new-files-json>.`);
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
  const commitsPath = stringOption(options, "commits");

  if (commitsPath) {
    return readCommitsFile(resolve(cwd, commitsPath));
  }

  const inputPath = stringOption(options, "input");

  if (inputPath) {
    return [{ message: await readFile(resolve(cwd, inputPath), "utf8") }];
  }

  throw new Error("Expected explicit commit input: --input <commit-message-file> or --commits <commits-json>.");
}

async function loadNewFiles(options: Record<string, string | boolean>, cwd: string): Promise<NewFileRecord[]> {
  const filesPath = stringOption(options, "new-files");
  return filesPath ? readNewFilesFile(resolve(cwd, filesPath)) : [];
}

async function loadPrInput(options: Record<string, string | boolean>, cwd: string): Promise<LocalPrInput> {
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
  const value = await readJsonFile(path, "commits JSON");

  if (!isCommitRecords(value)) {
    throw new Error("Invalid commits JSON: expected an array of objects with a string message and optional string sha.");
  }

  return value;
}

async function readNewFilesFile(path: string): Promise<NewFileRecord[]> {
  const value = await readJsonFile(path, "new files JSON");

  if (!isNewFileRecords(value)) {
    throw new Error("Invalid new files JSON: expected an array of objects with string path and content fields.");
  }

  return value;
}

async function readPrFile(path: string): Promise<LocalPrInput> {
  const value = await readJsonFile(path, "PR JSON");

  if (!isRecord(value)) {
    throw new Error("Invalid PR JSON: expected an object with commits and optional new_files arrays.");
  }

  const commits = value.commits;
  const newFiles = value.new_files ?? value.newFiles ?? [];

  if (!isCommitRecords(commits)) {
    throw new Error("Invalid PR JSON: commits must be an array of objects with a string message and optional string sha.");
  }

  if (!isNewFileRecords(newFiles)) {
    throw new Error("Invalid PR JSON: new_files must be an array of objects with string path and content fields.");
  }

  return { commits, newFiles };
}

async function readJsonFile(path: string, label: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid ${label}: file is not valid JSON.`);
    }

    throw error;
  }
}

function stringOption(options: Record<string, string | boolean>, key: string): string | undefined {
  const value = options[key];
  return typeof value === "string" ? value : undefined;
}

function hasOption(options: Record<string, string | boolean>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(options, key);
}

function hasPrInput(options: Record<string, string | boolean>): boolean {
  return hasOption(options, "pr") || hasOption(options, "commits") || hasOption(options, "new-files");
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCommitRecords(value: unknown): value is CommitRecord[] {
  return Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.message === "string" && optionalString(item.sha));
}

function isNewFileRecords(value: unknown): value is NewFileRecord[] {
  return Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.path === "string" && typeof item.content === "string");
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function helpText(): string {
  return `assisted-by

Commands:
  init [--policy <path>]
      Write a starter policy file. Defaults to .github/assisted-by.yml.

  check-commits --input <commit-message-file> [--policy <path>]
  check-commits --commits <commits-json> [--policy <path>]
      Check explicit local commit data.

  check-pr --pr <pr-json> [--policy <path>]
  check-pr --commits <commits-json> [--new-files <new-files-json>] [--policy <path>]
      Check explicit local PR fixture data. No GitHub API calls are made.

  policy doctor [--policy <path>]
      Validate policy syntax and option combinations.

  render-comment --pr <pr-json> [--policy <path>]
  render-comment --commits <commits-json> [--new-files <new-files-json>] [--policy <path>]
      Render deterministic Markdown report output from local data.

Examples:
  assisted-by check-commits --input examples/fixtures/commit-message.txt
  assisted-by check-pr --pr examples/fixtures/pr.valid.json --policy examples/advisory-policy.yml
  assisted-by render-comment --pr examples/fixtures/pr.strict-findings.json --policy examples/strict-policy.yml`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await run(process.argv.slice(2));
}
