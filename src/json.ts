import { fatalError, isRecord } from "isaacscript-common-ts";
import * as JSONC from "jsonc-parser";

/**
 * Helper function to a string as JSON.
 *
 * This expects the string to contain an object (i.e. `{}`), not an array or a primitive. The
 * function will terminate the program if any errors occur.
 */
export function getJSONCAsObject(
  fileContents: string,
): Record<string, unknown> {
  let json: unknown;
  try {
    json = JSONC.parse(fileContents);
  } catch (error) {
    fatalError("Failed to parse the contents of a file as JSONC:", error);
  }

  if (!isRecord(json)) {
    fatalError(
      "Failed to parse the contents of a file as JSONC, since the contents were not an object.",
    );
  }

  return json;
}
