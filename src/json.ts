import { error, isRecord } from "isaacscript-common-ts";
import * as JSONC from "jsonc-parser";

/**
 * Helper function to a string as JSON.
 *
 * This expects the string to contain an object (i.e. `{}`), not an array or a primitive. The
 * function will terminate the program if any errors occur.
 */
export function getJSONC(fileContents: string): Record<string, unknown> {
  let json: unknown;
  try {
    json = JSONC.parse(fileContents);
  } catch (err) {
    error(`Failed to parse the contents of a file as JSONC:`, err);
  }

  if (!isRecord(json)) {
    error(
      `Failed to parse the contents of a file as JSONC, since the contents were not an object.`,
    );
  }

  return json;
}
