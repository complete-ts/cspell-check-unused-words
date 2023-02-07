import { error } from "isaacscript-common-ts";
import { spawnSync, SpawnSyncReturns } from "node:child_process";

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
  } catch (err) {
    error(`Failed to run the "${command}" command:`, err);
  }

  const exitStatus = spawnSyncReturns.status;
  if (exitStatus === null) {
    error(`Failed to get the return status of command: ${command}`);
  }

  const stdout = spawnSyncReturns.output.join("\n").trim();

  return { exitStatus, stdout };
}
