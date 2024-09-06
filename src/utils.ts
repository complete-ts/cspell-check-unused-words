import * as YAML from "yaml";
import type { ReadonlyRecord } from "./completeCommon.js";
import { fatalError, isObject, readFile } from "./completeCommon.js";

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
