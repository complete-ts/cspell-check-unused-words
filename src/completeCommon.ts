// These functions are from "complete-common" and "complete-node". We do not want to depend on those
// libraries directly because the "complete" monorepo depends on this one, which would cause a
// circular dependency. Additionally, it would cause those two libraries to exist in the
// "node_modules" directory of the monorepo, which causes scripts to use the compiled version of the
// library instead of the one specified in the tsconfig paths.

import JSONC from "jsonc-parser";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export type ReadonlyRecord<K extends string | number | symbol, V> = Readonly<
  Record<K, V>
>;

const PACKAGE_JSON = "package.json";

/**
 * Helper function to synchronously delete a file or directory. If a path to a directory is
 * specified, the directory will be recursively deleted. If the path does not exist, this function
 * will be a no-op.
 *
 * This will throw an error if the file cannot be deleted.
 *
 * This function is variadic, meaning that you can pass as many file paths as you want to delete.
 */
export function deleteFileOrDirectory(...filePaths: readonly string[]): void {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, {
          recursive: true,
        });
      }
    } catch (error) {
      throw new Error(
        `Failed to delete file or directory "${filePath}": ${error}`,
      );
    }
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
 * Helper function to get the path to file, given either a file path, a directory path, or
 * `undefined`.
 *
 * This will throw an error if the file cannot be found.
 *
 * @param fileName The name of the file to find.
 * @param filePathOrDirPath Either the path to a file or the path to a directory which contains the
 *                          file. If undefined is passed, the current working directory will be
 *                          used.
 */
function getFilePath(
  fileName: string,
  filePathOrDirPath: string | undefined,
): string {
  if (filePathOrDirPath === undefined) {
    filePathOrDirPath = process.cwd(); // eslint-disable-line no-param-reassign
  }

  let filePath: string;
  if (isFile(filePathOrDirPath)) {
    filePath = filePathOrDirPath;
  } else if (isDirectory(filePathOrDirPath)) {
    filePath = path.join(filePathOrDirPath, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Failed to find a "${fileName}" file at the following directory: ${filePathOrDirPath}`,
      );
    }
  } else {
    throw new Error(
      `Failed to find a "${fileName}" file at the following path: ${filePathOrDirPath}`,
    );
  }

  return filePath;
}

/**
 * Helper function to parse a file as JSONC.
 *
 * This expects the file to contain an object (i.e. `{}`). This will print an error message and exit
 * the program if any errors occur.
 */
export function getJSONC(filePath: string): Record<string, unknown> {
  const fileContents = readFile(filePath);

  let json: unknown;
  try {
    json = JSONC.parse(fileContents);
  } catch (error) {
    throw new Error(`Failed to parse "${filePath}" as JSONC: ${error}`);
  }

  if (!isObject(json)) {
    throw new Error(
      `Failed to parse "${filePath}" as JSONC, since the contents were not an object.`,
    );
  }

  return json;
}

/**
 * Helper function to get a "package.json" file as an object. This will print an error message and
 * exit the program if the "package.json" file cannot be found or is otherwise invalid.
 *
 * @param filePathOrDirPath Either the path to a "package.json" file or the path to a directory
 *                          which contains a "package.json" file. If undefined is passed, the
 *                          current working directory will be used.
 */
function getPackageJSON(
  filePathOrDirPath: string | undefined,
): Record<string, unknown> {
  const filePath = getFilePath(PACKAGE_JSON, filePathOrDirPath);
  const packageJSONContents = readFile(filePath);
  const packageJSON = JSON.parse(packageJSONContents) as unknown;
  if (!isObject(packageJSON)) {
    throw new Error(
      `Failed to parse a "${PACKAGE_JSON}" file at the following path: ${filePath}`,
    );
  }

  return packageJSON;
}

/**
 * Helper function to get an arbitrary string field from a "package.json" file. If the field does
 * not exist, `undefined` will be returned. This will print an error message and exit the program if
 * the "package.json" file cannot be found or is otherwise invalid.
 *
 * @param filePathOrDirPathOrRecord Either the path to a "package.json" file, the path to a
 *                                 directory which contains a "package.json" file, or a parsed
 *                                 JavaScript object from a JSON file. If undefined is passed, the
 *                                 current working directory will be used.
 * @param fieldName The name of the field to retrieve.
 */
function getPackageJSONField(
  filePathOrDirPathOrRecord:
    | string
    | ReadonlyRecord<string, unknown>
    | undefined,
  fieldName: string,
): string | undefined {
  const packageJSON =
    typeof filePathOrDirPathOrRecord === "object"
      ? filePathOrDirPathOrRecord
      : getPackageJSON(filePathOrDirPathOrRecord);

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
 * Helper function to get N arbitrary string fields from a "package.json" file. This will print an
 * error message and exit the program if any of the fields do not exist or if the "package.json"
 * file cannot be found.
 *
 * Also see the `getPackageJSONFieldMandatory` function.
 *
 * @param filePathOrDirPath Either the path to a "package.json" file or the path to a directory
 *                          which contains a "package.json" file. If undefined is passed, the
 *                          current working directory will be used.
 * @param fieldNames The names of the fields to retrieve.
 */
export function getPackageJSONFieldsMandatory<T extends string>(
  filePathOrDirPath: string | undefined,
  ...fieldNames: readonly T[]
): Record<T, string> {
  const packageJSON = getPackageJSON(filePathOrDirPath);

  const fields: Partial<Record<T, string>> = {};

  for (const fieldName of fieldNames) {
    const field = getPackageJSONField(packageJSON, fieldName);
    if (field === undefined) {
      throw new Error(
        `Failed to find the "${fieldName}" field in a "${PACKAGE_JSON}" file.`,
      );
    }

    fields[fieldName] = field;
  }

  return fields as Record<T, string>;
}

export function getStringArrayFromObject(
  arrayName: string,
  object: ReadonlyRecord<string, unknown>,
  filePath: string,
): readonly string[] | undefined {
  const array = object[arrayName];

  if (array === undefined) {
    return undefined;
  }

  if (!Array.isArray(array)) {
    fatalError(
      `Failed to parse the "${arrayName}" property in the "${filePath}" file, since it was not an array.`,
    );
  }

  for (const element of array) {
    if (typeof element !== "string") {
      fatalError(
        `Failed to parse the "${arrayName}" array in the "${filePath}" file, since one of the entires was of type: ${typeof element}`,
      );
    }
  }

  return array as string[];
}

/**
 * Helper function to parse a file as YAML.
 *
 * This will print an error message and exit the program if any errors occur.
 */
export function getYAML(filePath: string): Record<string, unknown> {
  const fileContents = readFile(filePath);

  let yaml: unknown;
  try {
    yaml = YAML.parse(fileContents);
  } catch (error) {
    throw new Error(`Failed to parse "${filePath}" as YAML: ${error}`);
  }

  if (!isObject(yaml)) {
    throw new Error(
      `Failed to parse "${filePath}" as YAML, since the contents were not an object.`,
    );
  }

  return yaml;
}

/** Helper function to synchronously check if the provided path exists and is a directory. */
function isDirectory(filePath: string): boolean {
  return fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
}

/** Helper function to synchronously check if the provided path exists and is a file. */
export function isFile(filePath: string): boolean {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

/**
 * Helper function to narrow an unknown value to an object (i.e. a TypeScript record).
 *
 * Under the hood, this checks for `typeof variable === "object"`, `variable !== null`, and
 * `!Array.isArray(variable)`.
 */
function isObject(variable: unknown): variable is Record<string, unknown> {
  return (
    typeof variable === "object" &&
    variable !== null &&
    !Array.isArray(variable)
  );
}

/**
 * Helper function to synchronously read a file.
 *
 * This assumes that the file is a text file and uses an encoding of "utf8".
 *
 * This will throw an error if the file cannot be read.
 */
function readFile(filePath: string): string {
  let fileContents: string;

  try {
    fileContents = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new Error(`Failed to read file "${filePath}": ${error}`);
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

/**
 * Helper function to synchronously write data to a file.
 *
 * This will throw an error if the file cannot be written to.
 */
export function writeFile(filePath: string, data: string): void {
  try {
    fs.writeFileSync(filePath, data);
  } catch (error) {
    throw new Error(`Failed to write to the "${filePath}" file: ${error}`);
  }
}
