import chalk from "chalk";
import { $ } from "execa";
import path from "node:path";
import {
  CSPELL_CONFIG_NAMES,
  CSPELL_TEMP_CONFIG_NAME,
  CSPELL_TEMP_CONFIG_PATH,
  CWD,
} from "./constants.js";
import {
  deleteFileOrDirectory,
  fatalError,
  getJSONC,
  isFile,
  trimSuffix,
  writeFile,
} from "./isaacScriptCommon.js";
import type { Options } from "./parseArgs.js";

/**
 * We check for unused words by creating a temporary CSpell configuration file.
 *
 * @see https://github.com/streetsidesoftware/cspell/issues/4750
 * @see https://github.com/streetsidesoftware/cspell/issues/4836
 */
export function checkUnusedWords(options: Options): void {
  const { verbose } = options;

  if (verbose) {
    console.log("Checking for unused words in the CSpell configuration...");
  }

  const cSpellConfigPath = getCSpellConfigPath();
  const cSpellConfig = getJSONC(cSpellConfigPath);
  const { words } = cSpellConfig;

  // Do nothing if they do not have a "words" array inside of the config.
  if (words === undefined) {
    if (verbose) {
      console.log(
        'There was no "words" array found in the config, so this tool does not need to do anything.',
      );
    }

    return;
  }

  if (!Array.isArray(words)) {
    fatalError(
      `Failed to parse the "words" property in the "${cSpellConfigPath}" file, since it was not an array.`,
    );
  }

  // Do nothing if the "words" array is empty.
  if (words.length === 0) {
    if (verbose) {
      console.log(
        'The "words" array in the config was empty, so this tool does not need to do anything.',
      );
    }

    return;
  }

  for (const word of words) {
    if (typeof word !== "string") {
      fatalError(
        `Failed to parse the "words" array in the "${cSpellConfigPath}" file, since one of the entires was of type: ${typeof word}`,
      );
    }
  }

  const wordsStrings = words as string[];
  if (verbose) {
    console.log(
      `Found the following ${words.length} words in the config:`,
      words,
    );
  }

  const lowercaseWords = wordsStrings.map((word) => word.toLowerCase());

  const cSpellConfigName = path.basename(cSpellConfigPath);
  const ignorePaths = [cSpellConfigName, CSPELL_TEMP_CONFIG_NAME];
  const existingIgnorePaths = cSpellConfig["ignorePaths"];
  if (existingIgnorePaths !== undefined) {
    if (!Array.isArray(existingIgnorePaths)) {
      fatalError(
        `Failed to parse the "ignorePaths" property in the "${cSpellConfigPath}" file, since it was not an array.`,
      );
    }

    for (const ignorePath of existingIgnorePaths) {
      if (typeof ignorePath !== "string") {
        fatalError(
          `Failed to parse the "ignorePaths" array in the "${cSpellConfigPath}" file, since one of the entires was of type: ${typeof ignorePath}`,
        );
      }
    }

    const validatedIgnorePaths = existingIgnorePaths as string[];
    ignorePaths.push(...validatedIgnorePaths);
  }

  const newCSpellConfig = {
    ...cSpellConfig,

    // We want to ignore the CSpell configuration file itself and the temporary file.
    ignorePaths,

    // Delete all of the ignored words from the existing config. (Otherwise, the upcoming CSpell
    // command won't work properly.)
    words: undefined,

    // We have to add the "noConfigSearch" option:
    // https://github.com/streetsidesoftware/cspell/issues/4750
    noConfigSearch: true,
  };

  const newCSpellConfigString = JSON.stringify(newCSpellConfig);
  writeFile(CSPELL_TEMP_CONFIG_PATH, newCSpellConfigString);

  if (verbose) {
    console.log(`Wrote temporary config file to "${CSPELL_TEMP_CONFIG_PATH}":`);
    console.log(newCSpellConfigString);
  }

  // Run CSpell without any of the ignored words.
  const $$ = $({ reject: false }); // CSpell is expected to return a non-zero exit code.
  const { stdout } =
    $$.sync`cspell --no-progress --no-summary --unique --words-only --config ${CSPELL_TEMP_CONFIG_PATH}`;

  if (verbose) {
    console.log("The stdout of the CSpell command was as follows:");
    console.log(stdout);
  }

  const misspelledWords = stdout.split("\n");
  const misspelledLowercaseWords = misspelledWords.map((word) =>
    word.toLowerCase(),
  );
  const misspelledLowercaseWordsSet = new Set(misspelledLowercaseWords);
  const misspelledUniqueWords = [...misspelledLowercaseWordsSet.values()];

  // Sort the words.
  // https://stackoverflow.com/questions/8996963/how-to-perform-case-insensitive-sorting-array-of-string-in-javascript
  misspelledUniqueWords.sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  const misspelledWordsWithoutSuffix = misspelledUniqueWords.map((word) =>
    trimSuffix(word, "'s"),
  );

  const misspelledWordsSet = new Set(misspelledWordsWithoutSuffix);

  if (verbose) {
    console.log("Using a misspelled words set of:", misspelledWordsSet);
  }

  // Delete the temporary configuration.
  deleteFileOrDirectory(CSPELL_TEMP_CONFIG_PATH);

  // Check that each ignored word in the configuration file is actually being used.
  let oneOrMoreFailures = false;

  for (const word of lowercaseWords) {
    if (!misspelledWordsSet.has(word)) {
      console.log(
        `The following word in the CSpell config is not being used: ${chalk.green(
          word,
        )}`,
      );
      oneOrMoreFailures = true;
    }
  }

  if (verbose) {
    if (oneOrMoreFailures) {
      console.log("There were one or more unused words.");
    } else {
      console.log("Success! There were no unused words.");
    }
  }

  const exitCode = oneOrMoreFailures ? 1 : 0;
  process.exit(exitCode);
}

function getCSpellConfigPath(): string {
  for (const cSpellConfigName of CSPELL_CONFIG_NAMES) {
    const cSpellConfigPath = path.join(CWD, cSpellConfigName);
    if (isFile(cSpellConfigPath)) {
      return cSpellConfigPath;
    }
  }

  fatalError(
    `Failed to find your CSpell configuration file in the current working directory: ${CWD}`,
  );
}
