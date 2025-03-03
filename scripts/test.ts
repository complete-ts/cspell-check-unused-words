import {
  $q,
  copyFileOrDirectoryAsync,
  readFileAsync,
  testScript,
} from "complete-node";
import { ExecaError } from "execa";
import path from "node:path";

await testScript(async (projectRoot) => {
  const testsPath = path.join(projectRoot, "tests");
  await Promise.all([
    runTestCheck(testsPath),
    runTestFixSingleLine(testsPath),
    runTestFixMultiLine(testsPath),
  ]);
});

async function runTestCheck(testsPath: string) {
  const testPath = path.join(testsPath, "check");
  const $$ = $q({ cwd: testPath });
  try {
    await $$`tsx ../../src/main.ts --simple`;
  } catch (error) {
    if (!(error instanceof ExecaError)) {
      throw new TypeError("Failed to parse the error from the test.");
    }

    if (typeof error.stdout !== "string") {
      throw new TypeError("Failed to parse the stdout from the error.");
    }

    const stdout = error.stdout as string;
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

async function runTestFixSingleLine(testsPath: string) {
  const testPath = path.join(testsPath, "fix-single-line");
  const originalConfigPath = path.join(
    testsPath,
    "cspell.config.single-line-pre-fix.json",
  );
  const correctConfigPath = path.join(
    testsPath,
    "cspell.config.single-line-post-fix.json",
  );
  const configPath = path.join(testPath, "cspell.config.json");
  const $$ = $q({ cwd: testPath });

  let gotError = false;
  try {
    await $$`tsx ../../src/main.ts --fix`;
  } catch {
    console.log("Exit code was not 0.");
    gotError = true;
  }

  const newConfig = await readFileAsync(configPath);
  const correctConfig = await readFileAsync(correctConfigPath);

  // Restore the configuration file.
  await copyFileOrDirectoryAsync(originalConfigPath, configPath);

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

async function runTestFixMultiLine(testsPath: string) {
  const testPath = path.join(testsPath, "fix-multi-line");
  const originalConfigPath = path.join(
    testsPath,
    "cspell.config.multi-line-pre-fix.json",
  );
  const correctConfigPath = path.join(
    testsPath,
    "cspell.config.multi-line-post-fix.json",
  );
  const configPath = path.join(testPath, "cspell.config.json");
  const $$ = $q({ cwd: testPath });

  let gotError = false;
  try {
    await $$`tsx ../../src/main.ts --fix`;
  } catch {
    console.log("Exit code was not 0.");
    gotError = true;
  }

  const newConfig = await readFileAsync(configPath);
  const correctConfig = await readFileAsync(correctConfigPath);

  // Restore the configuration file.
  await copyFileOrDirectoryAsync(originalConfigPath, configPath);

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
