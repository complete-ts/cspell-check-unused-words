import chalk from "chalk";
import { fatalError } from "isaacscript-common-node";
import type { SpawnSyncReturns } from "node:child_process";
import { spawnSync } from "node:child_process";

/** Returns a tuple of exit status and stdout. The stdout is trimmed for convenience. */
export function execShell(
  command: string,
  args: string[],
): {
  exitStatus: number;
  stdout: string;
} {
  let spawnSyncReturns: SpawnSyncReturns<Buffer>;
  try {
    spawnSyncReturns = spawnSync(command, args, {
      shell: true,
    });
  } catch (error) {
    fatalError(`Failed to run the "${chalk.green(command)}" command:`, error);
  }

  const exitStatus = spawnSyncReturns.status;
  if (exitStatus === null) {
    fatalError(
      `Failed to get the return status of command: ${chalk.green(command)}`,
    );
  }

  const stdout = spawnSyncReturns.output.join("\n").trim();

  return { exitStatus, stdout };
}
