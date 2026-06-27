import { readFile, writeFile } from "node:fs/promises";
import { URL } from "node:url";

const bundlePath = new URL("../dist/index.cjs", import.meta.url);
const source = await readFile(bundlePath, "utf8");
await writeFile(bundlePath, source.replace(/[ \t]+$/gm, ""), "utf8");
