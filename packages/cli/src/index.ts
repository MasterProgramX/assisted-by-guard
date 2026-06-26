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
      if (command === "check-pr" && !hasOption(parsed.options, "commits") && !hasOption(parsed.options, "new-files")) {
        throw new Error("Expected --commits <commits-json> or --new-files <new-files-json> for check-pr.");
      }

      const policy = await loadPolicy(parsed.options, io.cwd);
      if (!reportPolicyDiagnostics(policy, io)) {
        return 1;
      }

      const commits = await loadCommits(parsed.options, io.cwd, true);
      const newFiles = await loadNewFiles(parsed.options, io.cwd);
      const result = validatePullRequestInput({ config: policy.config, commits, newFiles });
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

async function loadCommits(options: Record<string, string | boolean>, cwd: string, allowEmpty = false): Promise<CommitRecord[]> {
  const commitsPath = stringOption(options, "commits");

  if (commitsPath) {
    return readJsonFile<CommitRecord[]>(resolve(cwd, commitsPath));
  }

  const inputPath = stringOption(options, "input");

  if (inputPath) {
    return [{ message: await readFile(resolve(cwd, inputPath), "utf8") }];
  }

  if (allowEmpty) {
    return [];
  }

  throw new Error("Expected --input <commit-message-file> or --commits <commits-json>.");
}

async function loadNewFiles(options: Record<string, string | boolean>, cwd: string): Promise<NewFileRecord[]> {
  const filesPath = stringOption(options, "new-files");
  return filesPath ? readJsonFile<NewFileRecord[]>(resolve(cwd, filesPath)) : [];
}

async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function stringOption(options: Record<string, string | boolean>, key: string): string | undefined {
  const value = options[key];
  return typeof value === "string" ? value : undefined;
}

function hasOption(options: Record<string, string | boolean>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(options, key);
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

function helpText(): string {
  return `assisted-by

Commands:
  init
  check-commits --input <commit-message-file> [--policy <path>]
  check-pr [--commits <commits-json>] [--new-files <new-files-json>] [--policy <path>]
  policy doctor [--policy <path>]
  render-comment [--commits <commits-json>] [--new-files <new-files-json>] [--policy <path>]`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await run(process.argv.slice(2));
}
