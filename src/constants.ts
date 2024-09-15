import os from "node:os";
import path from "node:path";

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

const PROJECT_NAME = path.basename(CWD);

function getRandomString(length: number) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

  let counter = 0;
  let result = "";
  while (counter < length) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
    counter++;
  }
  return result;
}

const RANDOM_STRING_SUFFIX = getRandomString(32);

/**
 * We do not want the config file to be in the same directory as the project in the current working
 * directory, since other linting checks might use the clean status of the repository to indicate
 * success. Thus, we place the config file in the operating system's temporary directory with a
 * unique file name.
 *
 * Note that the arbitrary file name must end in ".json", or else invoking CSpell will fail.
 *
 * @see https://github.com/github/gitignore/blob/main/Node.gitignore
 */
export const CSPELL_TEMP_CONFIG_NAME = `cspell.config.${PROJECT_NAME}.${RANDOM_STRING_SUFFIX}.json`;

const TMP_PATH = os.tmpdir();
export const CSPELL_TEMP_CONFIG_PATH = path.join(
  TMP_PATH,
  CSPELL_TEMP_CONFIG_NAME,
);
