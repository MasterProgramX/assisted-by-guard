import type { NewFileRecord } from "./spdx.js";
import type { CommitRecord } from "./validation.js";

export interface LocalPrInput {
  commits: CommitRecord[];
  newFiles: NewFileRecord[];
}

export interface LocalInputDiagnostic {
  level: "error";
  message: string;
}

export type LocalInputValidationResult<T> =
  | {
      ok: true;
      value: T;
      diagnostics: [];
    }
  | {
      ok: false;
      diagnostics: LocalInputDiagnostic[];
    };

export function parseJsonInput(source: string, label: string): LocalInputValidationResult<unknown> {
  try {
    return valid(JSON.parse(source) as unknown);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return invalid(`Invalid ${label}: file is not valid JSON.`);
    }

    throw error;
  }
}

export function validateCommitsInput(value: unknown): LocalInputValidationResult<CommitRecord[]> {
  if (!isCommitRecords(value)) {
    return invalid("Invalid commits JSON: expected an array of objects with a string message and optional string sha.");
  }

  return valid(value);
}

export function validateNewFilesInput(value: unknown): LocalInputValidationResult<NewFileRecord[]> {
  if (!isNewFileRecords(value)) {
    return invalid("Invalid new files JSON: expected an array of objects with string path and content fields.");
  }

  return valid(value);
}

export function validatePrInput(value: unknown): LocalInputValidationResult<LocalPrInput> {
  if (!isRecord(value)) {
    return invalid("Invalid PR JSON: expected an object with commits and optional new_files arrays.");
  }

  const commits = value.commits;
  const newFiles = value.new_files ?? value.newFiles ?? [];

  if (!isCommitRecords(commits)) {
    return invalid("Invalid PR JSON: commits must be an array of objects with a string message and optional string sha.");
  }

  if (!isNewFileRecords(newFiles)) {
    return invalid("Invalid PR JSON: new_files must be an array of objects with string path and content fields.");
  }

  return valid({ commits, newFiles });
}

export function localInputErrorMessage(result: LocalInputValidationResult<unknown>): string {
  return result.ok ? "" : result.diagnostics.map((diagnostic) => diagnostic.message).join(" ");
}

function valid<T>(value: T): LocalInputValidationResult<T> {
  return {
    ok: true,
    value,
    diagnostics: []
  };
}

function invalid(message: string): LocalInputValidationResult<never> {
  return {
    ok: false,
    diagnostics: [
      {
        level: "error",
        message
      }
    ]
  };
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
