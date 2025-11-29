/* eslint-disable preserve-caught-error */

import { $q, copyFileOrDirectory, readFile, testScript } from "complete-node";
import type { ExecaError } from "execa";
import path from "node:path";
import { PACKAGE_ROOT } from "../src/constants.js";

const TESTS_PATH = path.join(PACKAGE_ROOT, "tests");
const MAIN_TS_PATH = path.join(PACKAGE_ROOT, "src", "main.ts");

await testScript(import.meta.dirname, async () => {
  await runTestCheck();
  await runTestFixSingleLine();
  await runTestFixMultiLine();
  await runTestCaseSensitivity();
});

async function runTestCheck() {
  const testPath = path.join(TESTS_PATH, "check");
  const $$ = $q({ cwd: testPath });
  try {
    await $$`tsx ${MAIN_TS_PATH} --simple`;
  } catch (error_) {
    // For some reason, `error instanceof ExecaError` is false here.
    const error = error_ as ExecaError;
    const { stdout } = error;

    if (typeof stdout !== "string") {
      throw new TypeError("Failed to parse the stdout from the error.");
    }

    const numLines = stdout.split("\n").length;

    if (numLines !== 1) {
      throw new Error(`Unexpected number of lines in output: ${numLines}`);
    }

    if (stdout.includes("misspelleda")) {
      throw new Error("Unexpected word in output: misspelleda");
    }

    if (!stdout.includes("misspelledb")) {
      throw new Error("Expected word in output: misspelledb");
    }

    return;
  }

  throw new Error("Failed to get an error while running the test.");
}

async function runTestFixSingleLine() {
  const testPath = path.join(TESTS_PATH, "fix-single-line");
  const originalConfigPath = path.join(
    TESTS_PATH,
    "cspell.config.single-line-pre-fix.json",
  );
  const correctConfigPath = path.join(
    TESTS_PATH,
    "cspell.config.single-line-post-fix.json",
  );
  const configPath = path.join(testPath, "cspell.config.json");
  const $$ = $q({ cwd: testPath });

  let gotError = false;
  try {
    await $$`tsx ${MAIN_TS_PATH} --fix`;
  } catch {
    console.log("Exit code was not 0.");
    gotError = true;
  }

  const newConfig = await readFile(configPath);
  const correctConfig = await readFile(correctConfigPath);

  // Restore the configuration file.
  await copyFileOrDirectory(originalConfigPath, configPath);

  if (newConfig !== correctConfig) {
    console.log("Configs were not identical.");
    gotError = true;
  }

  if (gotError) {
    console.error("Failed to fix the single-line test.");
    console.error("Fixed file was:");
    console.error("--------------------");
    console.error(newConfig);
    console.error("--------------------");
    console.error("Correct file was:");
    console.error("--------------------");
    console.error(correctConfig);
    console.error("--------------------");
    process.exit(1);
  }
}

async function runTestFixMultiLine() {
  const testPath = path.join(TESTS_PATH, "fix-multi-line");
  const originalConfigPath = path.join(
    TESTS_PATH,
    "cspell.config.multi-line-pre-fix.json",
  );
  const correctConfigPath = path.join(
    TESTS_PATH,
    "cspell.config.multi-line-post-fix.json",
  );
  const configPath = path.join(testPath, "cspell.config.json");
  const $$ = $q({ cwd: testPath });

  let gotError = false;
  try {
    await $$`tsx ${MAIN_TS_PATH} --fix`;
  } catch {
    console.log("Exit code was not 0.");
    gotError = true;
  }

  const newConfig = await readFile(configPath);
  const correctConfig = await readFile(correctConfigPath);

  // Restore the configuration file.
  await copyFileOrDirectory(originalConfigPath, configPath);

  if (newConfig !== correctConfig) {
    console.log("Configs were not identical.");
    gotError = true;
  }

  if (gotError) {
    console.error("Failed to fix the multi-line test.");
    console.error("Fixed file was:");
    console.error("--------------------");
    console.error(newConfig);
    console.error("--------------------");
    console.error("Correct file was:");
    console.error("--------------------");
    console.error(correctConfig);
    console.error("--------------------");
    process.exit(1);
  }
}

async function runTestCaseSensitivity() {
  const testPath = path.join(TESTS_PATH, "case-sensitivity");
  const $$ = $q({ cwd: testPath });
  try {
    await $$`tsx ${MAIN_TS_PATH} --simple`;
  } catch (error_) {
    // For some reason, `error instanceof ExecaError` is false here.
    const error = error_ as ExecaError;
    const { stdout } = error;

    if (typeof stdout !== "string") {
      throw new TypeError("Failed to parse the stdout from the error.");
    }

    // TODO: Add assertions for case-sensitive duplicate handling
    console.log("Case sensitivity test output:", stdout);

    return;
  }

  throw new Error("Failed to get an error while running the test.");
}
