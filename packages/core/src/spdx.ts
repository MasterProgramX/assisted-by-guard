import type { PolicyConfig } from "./policy.js";

export interface NewFileRecord {
  path: string;
  content: string;
}

export interface SpdxIssue {
  path: string;
  message: string;
}

const spdxPattern = /SPDX-License-Identifier:\s*[A-Za-z0-9-.+()]+/;
const sourceFilePattern =
  /\.(c|cc|cpp|cs|css|go|h|hpp|java|js|jsx|kt|mjs|php|py|rb|rs|scss|sh|swift|ts|tsx|vue)$/i;

export function validateNewFileSpdx(files: NewFileRecord[], config: PolicyConfig): SpdxIssue[] {
  if (!config.require_spdx_for_new_files) {
    return [];
  }

  return files
    .filter((file) => shouldRequireSpdx(file.path))
    .filter((file) => !hasSpdxHeader(file.content))
    .map((file) => ({
      path: file.path,
      message: "New source file is missing an SPDX-License-Identifier header."
    }));
}

export function shouldRequireSpdx(path: string): boolean {
  return sourceFilePattern.test(path);
}

export function hasSpdxHeader(content: string): boolean {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .slice(0, 20)
    .some((line) => spdxPattern.test(line));
}
