import { execFile } from "node:child_process";
import type { CommitRecord, LocalPrInput, NewFileRecord } from "@assisted-by-guard/core";

export interface GitExecutor {
  run(args: string[], cwd: string): Promise<string>;
}

export interface GitCollectedFile {
  path: string;
}

const recordSeparator = "\x1e";
const fieldSeparator = "\x00";

export const defaultGitExecutor: GitExecutor = {
  run: (args, cwd) => runGit(args, cwd)
};

export async function collectCommitsFromRange(range: string, cwd: string, executor: GitExecutor = defaultGitExecutor): Promise<CommitRecord[]> {
  assertSafeRange(range);
  const output = await executor.run(gitLogArgs(range), cwd);
  return parseGitLogOutput(output);
}

export async function collectNewFilesFromRange(range: string, cwd: string, executor: GitExecutor = defaultGitExecutor): Promise<NewFileRecord[]> {
  assertSafeRange(range);
  const endRef = rangeEndRef(range);
  const output = await executor.run(gitNewFilesArgs(range), cwd);
  const files = parseGitNewFilesOutput(output);

  return Promise.all(
    files.map(async (file) => ({
      path: file.path,
      content: await executor.run(["show", `${endRef}:${file.path}`], cwd)
    }))
  );
}

export async function collectPrInputFromRange(range: string, cwd: string, executor: GitExecutor = defaultGitExecutor): Promise<LocalPrInput> {
  const [commits, newFiles] = await Promise.all([
    collectCommitsFromRange(range, cwd, executor),
    collectNewFilesFromRange(range, cwd, executor)
  ]);

  return { commits, newFiles };
}

export function gitLogArgs(range: string): string[] {
  assertSafeRange(range);
  return ["log", "--format=%x1e%H%x00%B", range.trim()];
}

export function gitNewFilesArgs(range: string): string[] {
  assertSafeRange(range);
  return ["diff", "--name-only", "--diff-filter=A", "-z", range.trim()];
}

export function parseGitLogOutput(output: string): CommitRecord[] {
  return output
    .split(recordSeparator)
    .filter((record) => record.trim().length > 0)
    .map((record) => {
      const [sha = "", ...messageParts] = record.split(fieldSeparator);
      return {
        sha: sha.trim(),
        message: messageParts.join(fieldSeparator).trimEnd()
      };
    });
}

export function parseGitNewFilesOutput(output: string): GitCollectedFile[] {
  return output
    .split(fieldSeparator)
    .filter((path) => path.length > 0)
    .map((path) => ({ path }));
}

export function rangeEndRef(range: string): string {
  const trimmed = range.trim();
  assertSafeRange(trimmed);
  const tripleDot = trimmed.lastIndexOf("...");

  if (tripleDot >= 0) {
    return nonEmptyEndRef(trimmed.slice(tripleDot + 3));
  }

  const doubleDot = trimmed.lastIndexOf("..");

  if (doubleDot >= 0) {
    return nonEmptyEndRef(trimmed.slice(doubleDot + 2));
  }

  return trimmed;
}

export function assertSafeRange(range: string): void {
  const trimmed = range.trim();

  if (trimmed.length === 0) {
    throw new Error("Expected --range <git-range>.");
  }

  if (trimmed.startsWith("-")) {
    throw new Error("Invalid git range: range must be a revision expression, not an option.");
  }
}

function nonEmptyEndRef(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error("Invalid git range: range must include a right-side revision.");
  }

  if (trimmed.startsWith("-")) {
    throw new Error("Invalid git range: right-side revision must not be an option.");
  }

  return trimmed;
}

function runGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`git ${args[0] ?? "command"} failed: ${stderr.trim() || error.message}`));
        return;
      }

      resolve(stdout);
    });
  });
}
