import chalk from "chalk";
import { lint } from "cspell";
import { getDefaultConfigLoader } from "cspell-lib";
import { fatalError, trimSuffix } from "./completeCommon.js";
import { CWD } from "./constants.js";
import type { Options } from "./parseArgs.js";

export async function checkUnusedWords(options: Options): Promise<void> {
  const { verbose } = options;

  if (verbose) {
    console.log("Checking for unused words in the CSpell configuration...");
  }

  const cspellConfigFile =
    await getDefaultConfigLoader().searchForConfigFile(CWD);

  if (cspellConfigFile === undefined) {
    fatalError(
      `Failed to find your CSpell configuration file in the current working directory: ${CWD}`,
    );
  }

  const { settings: cSpellConfig, url: cSpellConfigUrl } = cspellConfigFile;

  if (cSpellConfig.words === undefined) {
    if (verbose) {
      console.log(
        'There was no "words" array found in the config, so this tool does not need to do anything.',
      );
    }

    return;
  }

  if (cSpellConfig.words.length === 0) {
    if (verbose) {
      console.log(
        'The "words" array in the config was empty, so this tool does not need to do anything.',
      );
    }

    return;
  }

  if (verbose) {
    console.log(
      `Found the following ${cSpellConfig.words.length} words in the config:`,
    );
    for (const [i, word] of cSpellConfig.words.entries()) {
      console.log(`${i + 1}) ${word}`);
    }
    console.log();
  }

  const lowercaseWords = new Set(
    cSpellConfig.words.map((word) => word.toLowerCase()),
  );

  // Clear the custom words from the configuration.
  cSpellConfig.words = undefined;

  const misspelledWords: string[] = [];
  await lint(
    ["."],
    {
      config: {
        settings: cSpellConfig,
        url: cSpellConfigUrl,
      },
      progress: false,
      summary: true,
      unique: true,
      wordsOnly: true,
    },
    {
      issue(issue) {
        // Ignore custom words in the config file. Using this approach instead of adding the config
        // file path to `ignorePaths` since it's a better foundation for a future feature that would
        // detect custom words elsewhere in the config file to prevent false positives. Doing this
        // properly would require an AST of the config to detect the custom words region offset,
        // which could be compared to the offset provided by the issue object...
        if (
          !(
            issue.uri === cSpellConfigUrl.href &&
            lowercaseWords.has(issue.text.toLowerCase())
          )
        ) {
          misspelledWords.push(issue.text);
        }
      },
    },
  );

  if (verbose) {
    console.log("CSpell found the following misspelled words:");
    console.log(misspelledWords.join("\n"));
    console.log();
  }

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

  // Check that each ignored word in the configuration file is actually being used.
  let oneOrMoreFailures = false;

  for (const word of lowercaseWords) {
    if (!misspelledWordsSet.has(word)) {
      oneOrMoreFailures = true;

      if (options.simple) {
        console.log(word);
      } else {
        console.log(
          `The following word in the CSpell config is not being used: ${chalk.green(
            word,
          )}`,
        );
      }
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
