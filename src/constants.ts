import path from "node:path";

export const CWD = process.cwd();

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
 * success. However, if the config file contains an "ignorePaths" property, then we must keep it in
 * the project directory to prevent the relative paths from getting messed up. Thus, we use an
 * arbitrary file name from GitHub's standard Node.js gitignore file.
 *
 * Note that the arbitrary file name must end in ".json", or else invoking CSpell will fail.
 *
 * @see https://github.com/github/gitignore/blob/main/Node.gitignore
 * @see https://github.com/streetsidesoftware/cspell/issues/6262
 */
export const CSPELL_TEMP_CONFIG_NAME = `npm-debug.log.cspell.config.${PROJECT_NAME}.${RANDOM_STRING_SUFFIX}.json`;
