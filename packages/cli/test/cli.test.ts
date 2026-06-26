import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { run } from "../src/index.js";

describe("CLI", () => {
  it("creates the default policy file", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    const output: string[] = [];

    const code = await run(["init"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    const policy = await readFile(join(cwd, ".github", "assisted-by.yml"), "utf8");
    expect(code).toBe(0);
    expect(output[0]).toBe("Created .github/assisted-by.yml");
    expect(policy).toContain("mode: advisory");
  });

  it("checks a local commit message fixture", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    await writeFile(join(cwd, "commit.txt"), "Add thing\n\nSigned-off-by: Ada Lovelace <ada@example.com>\n", "utf8");
    const output: string[] = [];

    const code = await run(["check-commits", "--input", "commit.txt"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("No policy findings.");
  });

  it("fails safely when the policy is invalid", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "assisted-by-"));
    await mkdir(join(cwd, ".github"), { recursive: true });
    await writeFile(join(cwd, ".github", "assisted-by.yml"), "require_ai_disclosure: yes\n", "utf8");
    await writeFile(join(cwd, "commit.txt"), "Add thing\n\nSigned-off-by: Ada Lovelace <ada@example.com>\n", "utf8");
    const output: string[] = [];

    const code = await run(["check-commits", "--input", "commit.txt"], {
      cwd,
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message)
    });

    expect(code).toBe(1);
    expect(output.join("\n")).toContain("require_ai_disclosure must be a boolean.");
  });
});
