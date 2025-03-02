import chalk from "chalk";
import { Command, Option } from "clipanion";
import { lint } from "cspell";
import { getDefaultConfigLoader } from "cspell-lib";
import { fatalError, readFileAsync, trimSuffix } from "./completeCommon.js";

export class CheckCommand extends Command {
  fix = Option.Boolean("-f,--fix", false, {
    description:
      "Automatically remove any unused words from the CSpell configuration.",
  });

  simple = Option.Boolean("-s,--simple", false, {
    description: "Only output the names of the words and nothing else.",
  });

  verbose = Option.Boolean("-v,--verbose", false, {
    description: "Enable verbose output.",
  });

  workingDirectory = Option.String("--workingDir", process.cwd(), {
    description:
      "Use the specified working directory instead of the shell's current working directory.",
  });

  async execute(): Promise<void> {
    if (this.verbose) {
      console.log("Checking for unused words in the CSpell configuration...");
    }

    const configLoader = getDefaultConfigLoader();
    const cspellConfigFile = await configLoader.searchForConfigFile(
      this.workingDirectory,
    );

    if (cspellConfigFile === undefined) {
      fatalError(
        `Failed to find your CSpell configuration file in the working directory of: ${this.workingDirectory}`,
      );
    }

    const { settings: cSpellConfig, url: cSpellConfigURL } = cspellConfigFile;

    if (this.verbose) {
      console.log(
        `Found a CSpell configuration file at: ${cSpellConfigURL.href}`,
      );
    }

    if (cSpellConfig.words === undefined) {
      if (this.verbose) {
        console.log(
          'There was no "words" array found in the config, so this tool does not need to do anything.',
        );
      }

      return;
    }

    if (cSpellConfig.words.length === 0) {
      if (this.verbose) {
        console.log(
          'The "words" array in the config was empty, so this tool does not need to do anything.',
        );
      }

      return;
    }

    if (this.verbose) {
      console.log(
        `Found the following ${cSpellConfig.words.length} words in the config:`,
      );
      for (const [i, word] of cSpellConfig.words.entries()) {
        console.log(`${i + 1}) ${word}`);
      }
      console.log();
    }

    const lowercaseWordsArray = cSpellConfig.words.map((word) =>
      word.toLowerCase(),
    );
    const lowercaseWordsSet = new Set(lowercaseWordsArray);

    // Clear the custom words from the configuration.
    cSpellConfig.words = undefined;

    const misspelledWords: string[] = [];
    await lint(
      ["."],
      {
        config: {
          settings: cSpellConfig,
          url: cSpellConfigURL,
        },
        progress: false,
        summary: true,
        unique: true,
        wordsOnly: true,
      },
      {
        issue(issue) {
          // Ignore custom words in the config file. We use this approach instead of adding the
          // config file path to `ignorePaths` since it is a better foundation for a future feature
          // that would detect custom words elsewhere in the config file to prevent false positives.
          // Doing this properly would require an AST of the config to detect the custom words
          // region offset, which could be compared to the offset provided by the issue object.
          if (
            !(
              issue.uri === cSpellConfigURL.href
              && lowercaseWordsSet.has(issue.text.toLowerCase())
            )
          ) {
            misspelledWords.push(issue.text);
          }
        },
      },
    );

    if (this.verbose) {
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

    if (this.verbose) {
      console.log(
        `Using a misspelled words set of ${misspelledWordsSet.size} entries:`,
      );
      for (const word of misspelledWordsSet) {
        console.log(`- ${word}`);
      }
      console.log();
    }

    // Check that each ignored word in the configuration file is actually being used.
    const unusedWords: string[] = [];

    for (const word of lowercaseWordsSet) {
      if (!misspelledWordsSet.has(word)) {
        unusedWords.push(word);

        if (this.simple) {
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

    if (this.verbose) {
      if (unusedWords.length === 0) {
        console.log("Success! There were no unused words.");
      } else {
        console.log("There were one or more unused words.");
      }
    }

    if (unusedWords.length > 0 && this.fix) {
      // We do not want to overwrite the configuration file in case there are comments in it.
      // Instead, we revert to manually removing the offending lines.
      const configText = await readFileAsync(cSpellConfigURL.href);
      if (configText.includes("\r\n")) {
        fatalError(
          `Your CSpell configuration file at "${cSpellConfigURL.href}" contains Windows-style newlines, which is not supported.`,
        );
      }
      const lines = configText.split("\n");
      for (const word of unusedWords) {
      }
    }

    const exitCode = unusedWords.length === 0 ? 0 : 1;
    process.exit(exitCode);
  }
}
