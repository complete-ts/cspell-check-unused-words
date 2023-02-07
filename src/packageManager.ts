import * as path from "node:path";
import { CWD } from "./constants.js";
import { PackageManager } from "./enums/PackageManager.js";
import { fileExists } from "./file.js";
import { error, getEnumValues } from "./utils.js";

const PACKAGE_MANAGER_LOCK_FILE_NAMES = {
  [PackageManager.NPM]: "package-lock.json",
  [PackageManager.YARN]: "yarn.lock",
  [PackageManager.PNPM]: "pnpm-lock.yaml",
} as const satisfies Record<PackageManager, string>;

const PACKAGE_MANAGER_NPX_COMMANDS = {
  [PackageManager.NPM]: "npx",
  [PackageManager.YARN]: "npx",
  [PackageManager.PNPM]: "pnpm exec",
} as const satisfies Record<PackageManager, string>;

function getPackageManagerLockFileName(packageManager: PackageManager): string {
  return PACKAGE_MANAGER_LOCK_FILE_NAMES[packageManager];
}

export function getPackageManagerExecCommand(
  packageManager: PackageManager,
): string {
  return PACKAGE_MANAGER_NPX_COMMANDS[packageManager];
}

export function getPackageManagerUsedForExistingProject(): PackageManager {
  const packageManagerSet = new Set<PackageManager>();

  for (const packageManager of getEnumValues(PackageManager)) {
    const lockFileName = getPackageManagerLockFileName(packageManager);
    const lockFilePath = path.join(CWD, lockFileName);
    if (fileExists(lockFilePath)) {
      packageManagerSet.add(packageManager);
    }
  }

  const packageManagers = [...packageManagerSet.values()];
  if (packageManagers.length > 1) {
    const packageManagerLockFileNames = packageManagers
      .map((packageManager) => getPackageManagerLockFileName(packageManager))
      .map((packageManagerLockFileName) => `"${packageManagerLockFileName}"`)
      .join(" & ");
    error(
      `Multiple different kinds of package manager lock files were found (${packageManagerLockFileNames}). You should delete the ones that you are not using so that this program can correctly detect your package manager.`,
    );
  }

  const packageManager = packageManagers[0];
  if (packageManager !== undefined) {
    return packageManager;
  }

  // Assume npm by default.
  return PackageManager.NPM;
}
