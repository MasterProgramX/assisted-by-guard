import { parse } from "yaml";

export type PolicyMode = "permissive" | "advisory" | "strict";

export interface PolicyConfig {
  mode: PolicyMode;
  require_ai_disclosure: boolean;
  accepted_trailers: string[];
  forbid_ai_signed_off_by: boolean;
  require_human_dco: boolean;
  require_spdx_for_new_files: boolean;
  accepted_tools: string[];
}

export interface PolicyDiagnostic {
  level: "error" | "warning";
  message: string;
}

export interface PolicyValidationResult {
  config: PolicyConfig;
  diagnostics: PolicyDiagnostic[];
}

export const defaultPolicyConfig: PolicyConfig = {
  mode: "advisory",
  require_ai_disclosure: false,
  accepted_trailers: ["Assisted-by"],
  forbid_ai_signed_off_by: true,
  require_human_dco: true,
  require_spdx_for_new_files: false,
  accepted_tools: []
};

const validModes = new Set<PolicyMode>(["permissive", "advisory", "strict"]);

export function parsePolicyYaml(source: string): unknown {
  const parsed = parse(source);
  return parsed ?? {};
}

export function validatePolicyConfig(input: unknown): PolicyValidationResult {
  const diagnostics: PolicyDiagnostic[] = [];
  const candidate = isRecord(input) ? input : {};

  if (!isRecord(input)) {
    diagnostics.push({
      level: "error",
      message: "Policy config must be a YAML object."
    });
  }

  const mode = readMode(candidate.mode, diagnostics);
  const requireAiDisclosure = readBoolean(
    candidate.require_ai_disclosure,
    defaultPolicyConfig.require_ai_disclosure,
    "require_ai_disclosure",
    diagnostics
  );
  const acceptedTrailers = readStringArray(
    candidate.accepted_trailers,
    defaultPolicyConfig.accepted_trailers,
    "accepted_trailers",
    diagnostics
  );
  const forbidAiSignedOffBy = readBoolean(
    candidate.forbid_ai_signed_off_by,
    defaultPolicyConfig.forbid_ai_signed_off_by,
    "forbid_ai_signed_off_by",
    diagnostics
  );
  const requireHumanDco = readBoolean(candidate.require_human_dco, defaultPolicyConfig.require_human_dco, "require_human_dco", diagnostics);
  const requireSpdxForNewFiles = readBoolean(
    candidate.require_spdx_for_new_files,
    defaultPolicyConfig.require_spdx_for_new_files,
    "require_spdx_for_new_files",
    diagnostics
  );
  const acceptedTools = readStringArray(candidate.accepted_tools, defaultPolicyConfig.accepted_tools, "accepted_tools", diagnostics);

  if (requireAiDisclosure && acceptedTrailers.length === 0) {
    diagnostics.push({
      level: "error",
      message: "accepted_trailers must contain at least one trailer when require_ai_disclosure is true."
    });
  }

  if (requireAiDisclosure && acceptedTools.length === 0) {
    diagnostics.push({
      level: "warning",
      message: "accepted_tools is empty; disclosure trailers will be checked for presence but tool names cannot be validated."
    });
  }

  const config: PolicyConfig = {
    mode,
    require_ai_disclosure: requireAiDisclosure,
    accepted_trailers: acceptedTrailers,
    forbid_ai_signed_off_by: forbidAiSignedOffBy,
    require_human_dco: requireHumanDco,
    require_spdx_for_new_files: requireSpdxForNewFiles,
    accepted_tools: acceptedTools
  };

  return { config, diagnostics };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readMode(value: unknown, diagnostics: PolicyDiagnostic[]): PolicyMode {
  if (value === undefined) {
    return defaultPolicyConfig.mode;
  }

  if (typeof value === "string" && validModes.has(value as PolicyMode)) {
    return value as PolicyMode;
  }

  diagnostics.push({
    level: "error",
    message: "mode must be one of: permissive, advisory, strict."
  });
  return defaultPolicyConfig.mode;
}

function readBoolean(value: unknown, fallback: boolean, key: string, diagnostics: PolicyDiagnostic[]): boolean {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  diagnostics.push({
    level: "error",
    message: `${key} must be a boolean.`
  });
  return fallback;
}

function readStringArray(value: unknown, fallback: string[], key: string, diagnostics: PolicyDiagnostic[]): string[] {
  if (value === undefined) {
    return fallback;
  }

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item.trim().length > 0)) {
    diagnostics.push({
      level: "error",
      message: `${key} must be a list of non-empty strings.`
    });
    return fallback;
  }

  return value.map((item) => item.trim());
}
