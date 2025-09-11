// These functions are from "complete-node". See the comment in the "completeCommon.ts" file.

import fs from "node:fs/promises";
import path from "node:path";
import { format, resolveConfig } from "prettier";
import type { ReadonlyRecord } from "./completeCommon.js";
import { assertDefined, assertString, isObject } from "./completeCommon.js";

/**
 * Helper function to print out an error message and then exit the program.
 *
 * All of the arguments will be passed to the `console.error` function.
 */
export function fatalError(...args: readonly unknown[]): never {
  console.error(...args);
  process.exit(1);
}

/**
 * Helper function to format a text string with Prettier.
 *
 * This is useful to ensure that a file is correctly formatted after modifying it but before writing
 * it back to disk.
 */
export async function formatWithPrettier(
  text: string,
  language: string,
  repoRoot: string,
): Promise<string> {
  const prettierConfig = await resolveConfig(repoRoot);

  return await format(text, {
    parser: language,
    ...prettierConfig,
  });
}

/**
 * Helper function to synchronously get the path to file, given either a file path, a directory
 * path, or `undefined`.
 *
 * @param fileName The name of the file to find.
 * @param filePathOrDirPath Either the path to a file or the path to a directory which contains the
 *                          file. If undefined is passed, the current working directory will be
 *                          used.
 * @throws If the file cannot be found.
 */
async function getFilePath(
  fileName: string,
  filePathOrDirPath: string | undefined,
): Promise<string> {
  filePathOrDirPath ??= process.cwd(); // eslint-disable-line no-param-reassign

  const file = await isFile(filePathOrDirPath);
  if (file) {
    return filePathOrDirPath;
  }

  const directory = await isDirectory(filePathOrDirPath);
  if (directory) {
    const filePath = path.join(filePathOrDirPath, fileName);
    const fileInDirectory = await isFile(filePath);
    if (fileInDirectory) {
      return filePath;
    }

    throw new Error(
      `Failed to find a "${fileName}" file at the following directory: ${filePathOrDirPath}`,
    );
  }

  throw new Error(
    `Failed to find a "${fileName}" file at the following path: ${filePathOrDirPath}`,
  );
}

/**
 * Helper function to asynchronously get a "package.json" file as an object. This will throw an
 * error if the "package.json" file cannot be found or is otherwise invalid.
 *
 * @param filePathOrDirPath Either the path to a "package.json" file or the path to a directory
 *                          which contains a "package.json" file. If undefined is passed, the
 *                          current working directory will be used.
 */
async function getPackageJSON(
  filePathOrDirPath: string | undefined,
): Promise<Record<string, unknown>> {
  const filePath = await getFilePath("package.json", filePathOrDirPath);
  const packageJSONContents = await readFile(filePath);
  const packageJSON = JSON.parse(packageJSONContents) as unknown;
  if (!isObject(packageJSON)) {
    throw new Error(
      `Failed to parse a "package.json" file at the following path: ${filePath}`,
    );
  }

  return packageJSON;
}

/**
 * Helper function to asynchronously get an arbitrary string field from a "package.json" file. If
 * the field does not exist, `undefined` will be returned.
 *
 * @param filePathOrDirPathOrRecord Either the path to a "package.json" file, the path to a
 *                                 directory which contains a "package.json" file, or a parsed
 *                                 JavaScript object from a JSON file. If undefined is passed, the
 *                                 current working directory will be used.
 * @param fieldName The name of the field to retrieve.
 * @throws If the "package.json" file cannot be found or the field is not a string.
 */
async function getPackageJSONField(
  filePathOrDirPathOrRecord:
    | string
    | ReadonlyRecord<string, unknown>
    | undefined,
  fieldName: string,
): Promise<string | undefined> {
  const packageJSON =
    typeof filePathOrDirPathOrRecord === "object"
      ? filePathOrDirPathOrRecord
      : await getPackageJSON(filePathOrDirPathOrRecord);

  const field = packageJSON[fieldName];
  if (field === undefined) {
    return undefined;
  }

  // Assume that all fields are strings. For objects (like e.g. "dependencies"), other helper
  // functions should be used.
  assertString(
    field,
    typeof filePathOrDirPathOrRecord === "string"
      ? `Failed to parse the "${fieldName}" field as a string in a "package.json" file: ${filePathOrDirPathOrRecord}`
      : `Failed to parse the "${fieldName}" field as a string in a "package.json" file.`,
  );

  return field;
}

/**
 * Helper function to asynchronously get N arbitrary string fields from a "package.json" file. This
 * will throw an error if the "package.json" file cannot be found or any of the fields do not exist
 * or any of the fields are not strings.
 *
 * @param filePathOrDirPath Either the path to a "package.json" file or the path to a directory
 *                          which contains a "package.json" file. If undefined is passed, the
 *                          current working directory will be used.
 * @param fieldNames The names of the fields to retrieve.
 */
export async function getPackageJSONFieldsMandatory<T extends string>(
  filePathOrDirPath: string | undefined,
  ...fieldNames: readonly T[]
): Promise<Record<T, string>> {
  const packageJSON = await getPackageJSON(filePathOrDirPath);

  const fields: Partial<Record<T, string>> = {};

  for (const fieldName of fieldNames) {
    // Since we already have the contents of the "package.json" file, nothing asynchronous is
    // actually happening in the `getPackageJSONField` function.
    // eslint-disable-next-line no-await-in-loop
    const field = await getPackageJSONField(packageJSON, fieldName);
    assertDefined(
      field,
      `Failed to find the "${fieldName}" field in a "package.json" file: ${filePathOrDirPath}`,
    );

    fields[fieldName] = field;
  }

  return fields as Record<T, string>;
}

/** Helper function to asynchronously check if the provided path exists and is a directory. */
async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/** Helper function to asynchronously check if the provided path exists and is a file. */
async function isFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Helper function to asynchronously read a file.
 *
 * This assumes that the file is a text file and uses an encoding of "utf8".
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Failed to read file: ${filePath}`, {
      cause: error,
    });
  }
}

/**
 * Helper function to asynchronously write data to a file.
 *
 * @throws If the file cannot be written to.
 */
export async function writeFile(filePath: string, data: string): Promise<void> {
  try {
    await fs.writeFile(filePath, data);
  } catch (error) {
    throw new Error(`Failed to write to the file: ${filePath}`, {
      cause: error,
    });
  }
}
