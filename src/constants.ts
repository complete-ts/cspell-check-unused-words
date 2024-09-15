import os from "node:os";
import path from "node:path";

const TMP_PATH = os.tmpdir();
export const CWD = process.cwd();

/** @see https://cspell.org/configuration/ */
export const CSPELL_JSON_CONFIG_NAMES = [
  ".cspell.json",
  "cspell.json",
  ".cSpell.json",
  "cSpell.json",
  "cspell.config.js",
  "cspell.config.cjs",
  "cspell.config.json",
  "cspell.config.yaml",
  "cspell.config.yml",
  "cspell.yaml",
  "cspell.yml",

  // The documentation for CSpell does not include JSONC file extensions, but they are valid.
  ".cspell.jsonc",
  "cspell.jsonc",
  ".cSpell.jsonc",
  "cSpell.jsonc",
  "cspell.config.jsonc",
] as const;

/**
 * We do not want the config file to be picked up by git, since various other linting checks use the
 * clean status of the repository to indicate success. Thus, we arbitrary choose a config file name
 * that is present in most ".gitignore" files.
 *
 * Note that the arbitrary file name must end in ".json", or else invoking CSpell will fail.
 *
 * @see https://github.com/github/gitignore/blob/main/Node.gitignore
 */
export const CSPELL_TEMP_CONFIG_NAME = "cspell.config.json";

export const CSPELL_TEMP_CONFIG_PATH = path.join(
  TMP_PATH,
  CSPELL_TEMP_CONFIG_NAME,
);
