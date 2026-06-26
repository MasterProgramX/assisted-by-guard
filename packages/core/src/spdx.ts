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

export function validateNewFileSpdx(files: NewFileRecord[], config: PolicyConfig): SpdxIssue[] {
  if (!config.require_spdx_for_new_files) {
    return [];
  }

  return files
    .filter((file) => !hasSpdxHeader(file.content))
    .map((file) => ({
      path: file.path,
      message: "New file is missing an SPDX-License-Identifier header."
    }));
}

export function hasSpdxHeader(content: string): boolean {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .slice(0, 20)
    .some((line) => spdxPattern.test(line));
}
