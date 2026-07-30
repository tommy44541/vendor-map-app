import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";

async function collectTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectTests(fullPath);
      return entry.isFile() && entry.name.endsWith(".test.ts") ? [fullPath] : [];
    })
  );
  return files.flat();
}

const testsDirectory = path.resolve("tests");
const testFiles = (await collectTests(testsDirectory)).sort();

if (testFiles.length === 0) {
  throw new Error(`No test files found under ${testsDirectory}`);
}

const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(
    process.execPath,
    ["--test", "--import", "tsx", ...testFiles],
    { stdio: "inherit" }
  );
  child.once("error", reject);
  child.once("exit", (code) => resolve(code ?? 1));
});

process.exitCode = exitCode;
