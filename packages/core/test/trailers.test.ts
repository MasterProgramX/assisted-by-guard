import { describe, expect, it } from "vitest";
import { findTrailers, parseCommitTrailers } from "../src/trailers.js";

describe("parseCommitTrailers", () => {
  it("parses a contiguous trailer block from the end of a commit message", () => {
    const trailers = parseCommitTrailers(`Add parser

Body text.

Signed-off-by: Ada Lovelace <ada@example.com>
Assisted-by: ChatGPT`);

    expect(trailers).toEqual([
      {
        key: "Signed-off-by",
        normalizedKey: "signed-off-by",
        value: "Ada Lovelace <ada@example.com>",
        line: 5
      },
      {
        key: "Assisted-by",
        normalizedKey: "assisted-by",
        value: "ChatGPT",
        line: 6
      }
    ]);
  });

  it("ignores trailer-looking text that is not in the final trailer block", () => {
    const trailers = parseCommitTrailers(`Add docs

Signed-off-by: Example in body

Real body ending.`);

    expect(trailers).toEqual([]);
  });
});

describe("findTrailers", () => {
  it("matches trailer names case-insensitively", () => {
    const trailers = findTrailers("Fix\n\nassisted-by: GitHub Copilot", ["Assisted-by"]);

    expect(trailers).toHaveLength(1);
    expect(trailers[0]?.value).toBe("GitHub Copilot");
  });
});
