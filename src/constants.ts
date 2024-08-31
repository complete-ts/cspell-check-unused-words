import * as path from "node:path";

export const CWD = process.cwd();

/** @see https://cspell.org/configuration/ */
export const CSPELL_CONFIG_NAMES = [
  ".cspell.json",
  "cspell.json",
  ".cSpell.json",
  "cSpell.json",
  /// "cspell.config.js", // We expect JSON to parse.
  /// "cspell.config.cjs", // We expect JSON to parse.
  "cspell.config.json",
  /// "cspell.config.yaml", // We expect JSON to parse.
  /// "cspell.config.yml", // We expect JSON to parse.
  /// "cspell.yaml", // We expect JSON to parse.
  /// "cspell.yml", // We expect JSON to parse.

  // The documentation for CSpell does not include JSONC file extensions, but they are valid.
  ".cspell.jsonc",
  "cspell.jsonc",
  ".cSpell.jsonc",
  "cSpell.jsonc",
  "cspell.config.jsonc",
] as const;

export const CSPELL_TEMP_CONFIG_NAME = "cspell.temp.jsonc";
export const CSPELL_TEMP_CONFIG_PATH = path.join(CWD, CSPELL_TEMP_CONFIG_NAME);
