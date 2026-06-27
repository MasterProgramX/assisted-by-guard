import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runAction } from "../src/index.js";

interface TestRuntime {
  inputs: Record<string, string>;
  env: Record<string, string>;
  outputs: Record<string, string>;
  warnings: string[];
  failures: string[];
  summary: string;
}

describe("runAction", () => {
  it("renders a report from a valid local PR fixture", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-action-"));
    const prPath = join(cwd, "pr.json");
    await writeFile(
      prPath,
      JSON.stringify({
        commits: [
          {
            sha: "abc1234",
            message: "Add docs\n\nSigned-off-by: Ada Lovelace <ada@example.com>\nAssisted-by: GitHub Copilot"
          }
        ],
        new_files: [
          {
            path: "src/example.ts",
            content: "// SPDX-License-Identifier: MIT\nexport const example = true;\n"
          }
        ]
      }),
      "utf8"
    );
    const runtime = createRuntime({ "pr-json": prPath });

    await runAction(runtime);

    expect(runtime.outputs.ok).toBe("true");
    expect(runtime.outputs.report).toContain("Assisted-By Guard Report");
    expect(runtime.summary).toContain("No policy findings.");
    expect(runtime.failures).toEqual([]);
  });

  it("requires explicit local input or pull request context", async () => {
    const runtime = createRuntime({});

    await expect(runAction(runtime)).rejects.toThrow("Expected explicit local input or a GitHub pull_request event");
  });

  it("rejects mixed PR and split input modes", async () => {
    const runtime = createRuntime({
      "pr-json": "pr.json",
      "commits-json": "commits.json"
    });

    await expect(runAction(runtime)).rejects.toThrow("Use either pr-json or commits-json/new-files-json, not both.");
  });

  it("keeps explicit split input mode ahead of pull request collection", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-action-"));
    const commitsPath = join(cwd, "commits.json");
    await writeFile(
      commitsPath,
      JSON.stringify([
        {
          sha: "abc1234",
          message: "Add docs\n\nSigned-off-by: Ada Lovelace <ada@example.com>"
        }
      ]),
      "utf8"
    );
    const runtime = createRuntime(
      { "commits-json": commitsPath },
      {
        env: { GITHUB_EVENT_PATH: join(cwd, "event.json") },
        fetcher: async () => {
          throw new Error("Pull request collection should not run for explicit local input.");
        }
      }
    );

    await runAction(runtime);

    expect(runtime.outputs.ok).toBe("true");
    expect(runtime.failures).toEqual([]);
  });

  it("collects pull request event data when local input is absent", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-action-"));
    const eventPath = join(cwd, "event.json");
    const policyPath = join(cwd, "policy.yml");
    await writeFile(
      eventPath,
      JSON.stringify({
        repository: { full_name: "owner/repo" },
        pull_request: {
          number: 42,
          head: {
            sha: "headsha",
            repo: { full_name: "fork/repo" }
          }
        }
      }),
      "utf8"
    );
    await writeFile(
      policyPath,
      [
        "mode: advisory",
        "require_ai_disclosure: false",
        "accepted_trailers:",
        "  - Assisted-by",
        "forbid_ai_signed_off_by: true",
        "require_human_dco: true",
        "require_spdx_for_new_files: true",
        "accepted_tools:",
        "  - GitHub Copilot"
      ].join("\n"),
      "utf8"
    );
    const runtime = createRuntime(
      { "policy-path": policyPath, "github-token": "token" },
      {
        env: {
          GITHUB_API_URL: "https://api.github.test",
          GITHUB_EVENT_PATH: eventPath,
          GITHUB_REPOSITORY: "owner/repo"
        },
        fetcher: fetchSequence([
          [
            "/repos/owner/repo/pulls/42/commits?per_page=100",
            [
              {
                sha: "abc1234",
                commit: {
                  message: "Add source\n\nSigned-off-by: Ada Lovelace <ada@example.com>"
                }
              }
            ]
          ],
          [
            "/repos/owner/repo/pulls/42/files?per_page=100",
            [
              {
                filename: "src/new.ts",
                status: "added"
              },
              {
                filename: "docs/new.md",
                status: "added"
              }
            ]
          ],
          [
            "/repos/fork/repo/contents/src/new.ts?ref=headsha",
            {
              encoding: "base64",
              content: Buffer.from("// SPDX-License-Identifier: MIT\nexport {};\n", "utf8").toString("base64")
            }
          ]
        ])
      }
    );

    await runAction(runtime);

    expect(runtime.outputs.ok).toBe("true");
    expect(runtime.summary).toContain("Commits checked | 1");
    expect(runtime.summary).toContain("New files checked | 1");
    expect(runtime.failures).toEqual([]);
  });

  it("requires a token for pull request event collection", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-action-"));
    const eventPath = join(cwd, "event.json");
    await writeFile(eventPath, JSON.stringify({ repository: { full_name: "owner/repo" }, pull_request: { number: 42, head: { sha: "headsha" } } }), "utf8");
    const runtime = createRuntime({}, { env: { GITHUB_EVENT_PATH: eventPath, GITHUB_REPOSITORY: "owner/repo" } });

    await expect(runAction(runtime)).rejects.toThrow("requires github-token with read-only repository permissions");
  });

  it("rejects invalid PR fixture shape", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-action-"));
    const prPath = join(cwd, "pr.json");
    await writeFile(prPath, JSON.stringify({ commits: [{ sha: "abc1234" }] }), "utf8");
    const runtime = createRuntime({ "pr-json": prPath });

    await expect(runAction(runtime)).rejects.toThrow("Invalid PR JSON: commits must be an array of objects with a string message and optional string sha.");
  });

  it("rejects invalid commits fixture shape", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-action-"));
    const commitsPath = join(cwd, "commits.json");
    await writeFile(commitsPath, JSON.stringify([{ sha: "abc1234" }]), "utf8");
    const runtime = createRuntime({ "commits-json": commitsPath });

    await expect(runAction(runtime)).rejects.toThrow("Invalid commits JSON: expected an array of objects with a string message and optional string sha.");
  });
});

function createRuntime(
  inputs: Record<string, string>,
  options: { env?: Record<string, string>; fetcher?: Parameters<typeof runAction>[0]["fetch"] } = {}
): Parameters<typeof runAction>[0] & TestRuntime {
  const runtime = {
    inputs,
    env: options.env ?? {},
    outputs: {},
    warnings: [],
    failures: [],
    summary: "",
    getInput: (name: string) => runtime.inputs[name] ?? "",
    getEnv: (name: string) => runtime.env[name],
    fetch: options.fetcher ?? unexpectedFetch,
    setOutput: (name: string, value: string) => {
      runtime.outputs[name] = value;
    },
    setFailed: (message: string) => {
      runtime.failures.push(message);
    },
    warning: (message: string) => {
      runtime.warnings.push(message);
    },
    writeSummary: async (markdown: string) => {
      runtime.summary = markdown;
    }
  };

  return runtime;
}

async function unexpectedFetch(): Promise<never> {
  throw new Error("Unexpected GitHub API request.");
}

function fetchSequence(responses: Array<[path: string, body: unknown]>): Parameters<typeof runAction>[0]["fetch"] {
  return async (url) => {
    const parsed = new URL(url);
    const response = responses.shift();

    if (!response) {
      throw new Error(`Unexpected GitHub API request: ${parsed.pathname}`);
    }

    expect(`${parsed.pathname}${parsed.search}`).toBe(response[0]);

    return {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: {
        get: () => null
      },
      json: async () => response[1],
      text: async () => JSON.stringify(response[1])
    };
  };
}
