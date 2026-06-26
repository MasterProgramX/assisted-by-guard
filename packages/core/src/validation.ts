import type { PolicyConfig } from "./policy.js";
import type { NewFileRecord } from "./spdx.js";
import { validateNewFileSpdx } from "./spdx.js";
import { normalizeTrailerKey, parseCommitTrailers } from "./trailers.js";

export interface CommitRecord {
  sha?: string;
  message: string;
}

export interface ValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  subject?: string;
}

export interface ValidationResult {
  ok: boolean;
  mode: PolicyConfig["mode"];
  issues: ValidationIssue[];
  commitCount: number;
  fileCount: number;
}

const signedOffByKey = "signed-off-by";
const humanSignerPattern = /^[^<>\n]+<[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>$/;

export function validatePullRequestInput(input: {
  commits: CommitRecord[];
  newFiles?: NewFileRecord[];
  config: PolicyConfig;
}): ValidationResult {
  const issues: ValidationIssue[] = [];
  const acceptedTrailerKeys = new Set(input.config.accepted_trailers.map(normalizeTrailerKey));

  for (const commit of input.commits) {
    const trailers = parseCommitTrailers(commit.message);
    const signedOffBy = trailers.filter((trailer) => trailer.normalizedKey === signedOffByKey);
    const disclosureTrailers = trailers.filter((trailer) => acceptedTrailerKeys.has(trailer.normalizedKey));
    const subject = commit.sha ?? firstSubjectLine(commit.message);
    const humanSigners = signedOffBy.filter((trailer) => isHumanDcoSigner(trailer.value, input.config));

    if (input.config.require_human_dco && signedOffBy.length === 0) {
      issues.push(issue(input.config, "missing-human-dco", "Commit is missing a human Signed-off-by trailer.", subject));
    }

    if (input.config.require_human_dco && signedOffBy.length > 0 && humanSigners.length === 0) {
      issues.push(issue(input.config, "invalid-human-dco", "Signed-off-by must identify an accountable human in Name <email> form.", subject));
    }

    if (input.config.require_ai_disclosure && disclosureTrailers.length === 0) {
      issues.push(issue(input.config, "missing-ai-disclosure", "Commit is missing an accepted AI assistance disclosure trailer.", subject));
    }

    if (disclosureTrailers.length > 0 && input.config.accepted_tools.length > 0) {
      for (const trailer of disclosureTrailers) {
        if (!matchesAcceptedTool(trailer.value, input.config)) {
          issues.push(issue(input.config, "unaccepted-tool", "Disclosure trailer does not match the configured accepted_tools list.", subject));
        }
      }
    }

    if (input.config.forbid_ai_signed_off_by) {
      for (const trailer of signedOffBy) {
        if (matchesAcceptedTool(trailer.value, input.config)) {
          issues.push(issue(input.config, "ai-signed-off-by", "Signed-off-by must identify an accountable human, not an AI tool.", subject));
        }
      }
    }
  }

  for (const spdxIssue of validateNewFileSpdx(input.newFiles ?? [], input.config)) {
    issues.push(issue(input.config, "missing-spdx", spdxIssue.message, spdxIssue.path));
  }

  const hasBlockingIssue = issues.some((item) => item.level === "error");
  return {
    ok: !hasBlockingIssue,
    mode: input.config.mode,
    issues,
    commitCount: input.commits.length,
    fileCount: input.newFiles?.length ?? 0
  };
}

function issue(config: PolicyConfig, code: string, message: string, subject?: string): ValidationIssue {
  return {
    level: config.mode === "strict" ? "error" : "warning",
    code,
    message,
    subject
  };
}

function firstSubjectLine(message: string): string {
  return message.replace(/\r\n/g, "\n").split("\n").find((line) => line.trim().length > 0)?.trim() ?? "(empty commit message)";
}

function isHumanDcoSigner(value: string, config: PolicyConfig): boolean {
  return humanSignerPattern.test(value.trim()) && !matchesAcceptedTool(value, config);
}

function matchesAcceptedTool(value: string, config: PolicyConfig): boolean {
  return config.accepted_tools.some((tool) => containsConfiguredToolName(value, tool));
}

function containsConfiguredToolName(value: string, tool: string): boolean {
  const normalizedValue = value.toLowerCase();
  const normalizedTool = tool.trim().toLowerCase();

  if (normalizedTool.length === 0) {
    return false;
  }

  const escapedTool = normalizedTool.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^a-z0-9])${escapedTool}($|[^a-z0-9])`, "i");
  return pattern.test(normalizedValue);
}
