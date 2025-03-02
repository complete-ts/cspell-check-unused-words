// These functions are from "complete-common" and "complete-node". We do not want to depend on those
// libraries directly because the "complete" monorepo depends on this one, which would cause a
// circular dependency. Additionally, it would cause those two libraries to exist in the
// "node_modules" directory of the monorepo, which causes scripts to use the compiled version of the
// library instead of the one specified in the tsconfig paths.

import fsPromises from "node:fs/promises";
import path from "node:path";

type ReadonlyRecord<K extends string | number | symbol, V> = Readonly<
  Record<K, V>
>;

const PACKAGE_JSON = "package.json";

/**
 * Helper function to throw an error if the provided value is equal to `undefined`.
 *
 * This is useful to have TypeScript narrow a `T | undefined` value to `T` in a concise way.
 */
function assertDefined<T>(
  value: T,
  ...[msg]: [undefined] extends [T]
    ? [string]
    : [
        "The assertion is useless because the provided value does not contain undefined.",
      ]
): asserts value is Exclude<T, undefined> {
  if (value === undefined) {
    throw new TypeError(msg);
  }
}

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
 * Helper function to synchronously get the path to file, given either a file path, a directory
 * path, or `undefined`.
 *
 * This will throw an error if the file cannot be found.
 *
 * @param fileName The name of the file to find.
 * @param filePathOrDirPath Either the path to a file or the path to a directory which contains the
 *                          file. If undefined is passed, the current working directory will be
 *                          used.
 */
export async function getFilePath(
  fileName: string,
  filePathOrDirPath: string | undefined,
): Promise<string> {
  if (filePathOrDirPath === undefined) {
    filePathOrDirPath = process.cwd(); // eslint-disable-line no-param-reassign
  }

  const file = await isFileAsync(filePathOrDirPath);
  if (file) {
    return filePathOrDirPath;
  }

  const directory = await isDirectoryAsync(filePathOrDirPath);
  if (directory) {
    const filePath = path.join(filePathOrDirPath, fileName);
    const fileInDirectory = await isFileAsync(filePath);
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
  const filePath = await getFilePath(PACKAGE_JSON, filePathOrDirPath);
  const packageJSONContents = await readFileAsync(filePath);
  const packageJSON = JSON.parse(packageJSONContents) as unknown;
  if (!isObject(packageJSON)) {
    throw new Error(
      `Failed to parse a "${PACKAGE_JSON}" file at the following path: ${filePath}`,
    );
  }

  return packageJSON;
}

/**
 * Helper function to asynchronously get an arbitrary string field from a "package.json" file. If
 * the field does not exist, `undefined` will be returned. This will throw an error if the
 * "package.json" file cannot be found or the field is not a string.
 *
 * @param filePathOrDirPathOrRecord Either the path to a "package.json" file, the path to a
 *                                 directory which contains a "package.json" file, or a parsed
 *                                 JavaScript object from a JSON file. If undefined is passed, the
 *                                 current working directory will be used.
 * @param fieldName The name of the field to retrieve.
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
  if (typeof field !== "string") {
    if (typeof filePathOrDirPathOrRecord === "string") {
      // eslint-disable-next-line unicorn/prefer-type-error
      throw new Error(
        `Failed to parse the "${fieldName}" field in a "${PACKAGE_JSON}" file from: ${filePathOrDirPathOrRecord}`,
      );
    }

    throw new Error(
      `Failed to parse the "${fieldName}" field in a "${PACKAGE_JSON}" file.`,
    );
  }

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
      `Failed to find the "${fieldName}" field in a "${PACKAGE_JSON}" file.`,
    );

    fields[fieldName] = field;
  }

  return fields as Record<T, string>;
}

/** Helper function to asynchronously check if the provided path exists and is a directory. */
async function isDirectoryAsync(filePath: string): Promise<boolean> {
  try {
    const stats = await fsPromises.stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/** Helper function to asynchronously check if the provided path exists and is a file. */
async function isFileAsync(filePath: string): Promise<boolean> {
  try {
    const stats = await fsPromises.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}
/**
 * Helper function to narrow an unknown value to an object (i.e. a TypeScript record).
 *
 * Under the hood, this checks for `typeof variable === "object"`, `variable !== null`, and
 * `!Array.isArray(variable)`.
 */
function isObject(variable: unknown): variable is Record<string, unknown> {
  return (
    typeof variable === "object"
    && variable !== null
    && !Array.isArray(variable)
  );
}

/**
 * Helper function to asynchronously read a file.
 *
 * This assumes that the file is a text file and uses an encoding of "utf8".
 *
 * This will throw an error if the file cannot be read.
 */
export async function readFileAsync(filePath: string): Promise<string> {
  let fileContents: string;

  try {
    fileContents = await fsPromises.readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Failed to read text file "${filePath}": ${error}`);
  }

  return fileContents;
}

/** Helper function to trim a suffix from a string, if it exists. Returns the trimmed string. */
export function trimSuffix(string: string, prefix: string): string {
  if (!string.endsWith(prefix)) {
    return string;
  }

  const endCharacter = string.length - prefix.length;
  return string.slice(0, endCharacter);
}
