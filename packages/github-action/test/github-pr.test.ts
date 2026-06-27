import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { collectPullRequestEventInput, parseNextLink, type FetchFunction } from "../src/github-pr.js";

describe("GitHub pull request collection", () => {
  it("parses pagination links", () => {
    expect(parseNextLink('<https://api.github.test/page/2>; rel="next", <https://api.github.test/page/9>; rel="last"')).toBe(
      "https://api.github.test/page/2"
    );
    expect(parseNextLink('<https://api.github.test/page/1>; rel="prev"')).toBeUndefined();
  });

  it("paginates commits and maps added source file contents", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-action-"));
    const eventPath = join(cwd, "event.json");
    await writeFile(
      eventPath,
      JSON.stringify({
        repository: { full_name: "owner/repo" },
        pull_request: {
          number: 7,
          head: {
            sha: "abc123",
            repo: { full_name: "owner/repo" }
          }
        }
      }),
      "utf8"
    );

    const fetcher = fetchSequence([
      {
        path: "/repos/owner/repo/pulls/7/commits?per_page=100",
        body: [
          {
            sha: "one",
            commit: { message: "One\n\nSigned-off-by: Ada Lovelace <ada@example.com>" }
          }
        ],
        link: '<https://api.github.test/repos/owner/repo/pulls/7/commits?page=2&per_page=100>; rel="next"'
      },
      {
        path: "/repos/owner/repo/pulls/7/commits?page=2&per_page=100",
        body: [
          {
            sha: "two",
            commit: { message: "Two\n\nSigned-off-by: Ada Lovelace <ada@example.com>" }
          }
        ]
      },
      {
        path: "/repos/owner/repo/pulls/7/files?per_page=100",
        body: [
          { filename: "src/added.ts", status: "added" },
          { filename: "README.md", status: "added" },
          { filename: "src/changed.ts", status: "modified" }
        ]
      },
      {
        path: "/repos/owner/repo/contents/src/added.ts?ref=abc123",
        body: {
          encoding: "base64",
          content: Buffer.from("// SPDX-License-Identifier: MIT\nexport const value = true;\n", "utf8").toString("base64")
        }
      }
    ]);

    await expect(
      collectPullRequestEventInput({
        token: "token",
        eventPath,
        repository: "owner/repo",
        apiUrl: "https://api.github.test",
        fetcher,
        includeNewFileContents: true
      })
    ).resolves.toEqual({
      commits: [
        { sha: "one", message: "One\n\nSigned-off-by: Ada Lovelace <ada@example.com>" },
        { sha: "two", message: "Two\n\nSigned-off-by: Ada Lovelace <ada@example.com>" }
      ],
      newFiles: [
        {
          path: "src/added.ts",
          content: "// SPDX-License-Identifier: MIT\nexport const value = true;\n"
        }
      ]
    });
  });
});

interface QueuedResponse {
  path: string;
  body: unknown;
  link?: string;
}

function fetchSequence(responses: QueuedResponse[]): FetchFunction {
  return async (url) => {
    const parsed = new URL(url);
    const response = responses.shift();

    if (!response) {
      throw new Error(`Unexpected GitHub API request: ${parsed.pathname}${parsed.search}`);
    }

    expect(`${parsed.pathname}${parsed.search}`).toBe(response.path);

    return {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: {
        get: (name) => (name.toLowerCase() === "link" ? (response.link ?? null) : null)
      },
      json: async () => response.body,
      text: async () => JSON.stringify(response.body)
    };
  };
}
