import chalk from "chalk";
import { $ } from "execa";
import path from "node:path";
import {
  deleteFileOrDirectory,
  fatalError,
  getJSONC,
  isFile,
  trimSuffix,
  writeFile,
} from "./completeCommon.js";
import {
  CSPELL_JSON_CONFIG_NAMES,
  CSPELL_TEMP_CONFIG_NAME,
  CWD,
} from "./constants.js";
import type { Options } from "./parseArgs.js";
import { getStringArrayFromObject, getYAML } from "./utils.js";

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
  if (cSpellConfigPath === undefined) {
    fatalError(
      `Failed to find your CSpell configuration file in the current working directory: ${CWD}`,
    );
  }

  const cSpellConfig = getCSpellConfig(cSpellConfigPath);
  const words = getStringArrayFromObject(
    "words",
    cSpellConfig,
    cSpellConfigPath,
  );

  if (words === undefined) {
    if (verbose) {
      console.log(
        'There was no "words" array found in the config, so this tool does not need to do anything.',
      );
    }

    return;
  }

  if (words.length === 0) {
    if (verbose) {
      console.log(
        'The "words" array in the config was empty, so this tool does not need to do anything.',
      );
    }

    return;
  }

  if (verbose) {
    console.log(`Found the following ${words.length} words in the config:`);
    for (const [i, word] of words.entries()) {
      console.log(`${i + 1}) ${word}`);
    }
    console.log();
  }

  const lowercaseWords = words.map((word) => word.toLowerCase());

  const cSpellConfigName = path.basename(cSpellConfigPath);
  const ignorePaths = [cSpellConfigName, CSPELL_TEMP_CONFIG_NAME];

  const existingIgnorePaths = getStringArrayFromObject(
    "ignorePaths",
    cSpellConfig,
    cSpellConfigPath,
  );
  if (existingIgnorePaths !== undefined) {
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

  const tempConfigPath = path.join(CWD, CSPELL_TEMP_CONFIG_NAME);
  const newCSpellConfigString = JSON.stringify(newCSpellConfig);
  writeFile(tempConfigPath, newCSpellConfigString);

  if (verbose) {
    console.log(`Wrote temporary config file to "${tempConfigPath}":`);
    console.log(newCSpellConfigString);
    console.log();
  }

  // Run CSpell without any of the ignored words.
  const $$ = $({ reject: false }); // CSpell is expected to return a non-zero exit code.
  const { stdout } =
    $$.sync`cspell --no-progress --no-summary --unique --words-only --config ${tempConfigPath} .`;

  if (verbose) {
    console.log("The stdout of the CSpell command was as follows:");
    console.log(stdout);
    console.log();
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
    console.log(
      `Using a misspelled words set of ${misspelledWordsSet.size} entries:`,
    );
    for (const word of misspelledWordsSet) {
      console.log(`- ${word}`);
    }
    console.log();
  }

  // Delete the temporary configuration.
  deleteFileOrDirectory(tempConfigPath);

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

function getCSpellConfigPath(): string | undefined {
  for (const cSpellConfigName of CSPELL_JSON_CONFIG_NAMES) {
    const cSpellConfigPath = path.join(CWD, cSpellConfigName);
    if (isFile(cSpellConfigPath)) {
      return cSpellConfigPath;
    }
  }

  return undefined;
}

function getCSpellConfig(cSpellConfigPath: string) {
  if (
    cSpellConfigPath.endsWith(".json") ||
    cSpellConfigPath.endsWith(".jsonc")
  ) {
    return getJSONC(cSpellConfigPath);
  }

  if (cSpellConfigPath.endsWith(".yml")) {
    return getYAML(cSpellConfigPath);
  }

  throw new Error(
    `Failed to parse the CSpell configuration format for the config file of: ${cSpellConfigPath}`,
  );
}
