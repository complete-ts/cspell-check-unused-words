import { $op, testScript } from "complete-node";
import { ExecaError } from "execa";
import path from "node:path";

await testScript(async () => {
  const cwd = process.cwd();
  const testsPath = path.join(cwd, "tests");
  const $$ = $op({ cwd: testsPath });
  try {
    await $$`tsx ../src/main.ts --simple`;
  } catch (error) {
    if (!(error instanceof ExecaError)) {
      throw new TypeError("Failed to parse the error from the test.");
    }

    if (typeof error.stdout !== "string") {
      throw new TypeError("Failed to parse the stdout from the error.");
    }

    const stdout = error.stdout as string;
    console.log("Output was:");
    console.log(stdout);
    console.log();

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
});
