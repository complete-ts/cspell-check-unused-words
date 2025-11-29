import chalk from "chalk";
import { Command, Option } from "clipanion";
import { lint } from "cspell";
import { getDefaultConfigLoader } from "cspell-lib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertDefined,
  assertString,
  trimPrefix,
  trimSuffix,
} from "./completeCommon.js";
import {
  fatalError,
  formatWithPrettier,
  readFile,
  writeFile,
} from "./completeNode.js";

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

    const { settings: cSpellConfig, url } = cspellConfigFile;
    const configPath = fileURLToPath(url.href);

    if (this.verbose) {
      console.log(`Found a CSpell configuration file at: ${configPath}`);
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

    // Check that each word in the configuration file is not duplicated. (e.g. "apple" and "APPLE")
    const unusedWords: string[] = [];
    const seenLowercaseWords = new Map<string, string>();
    for (const word of cSpellConfig.words) {
      const lowercase = word.toLowerCase();
      const existingWord = seenLowercaseWords.get(lowercase);

      if (existingWord === undefined) {
        seenLowercaseWords.set(lowercase, word);
      } else {
        unusedWords.push(word);

        if (this.simple) {
          console.log(word);
        } else {
          console.log(
            `The following word in the CSpell config is duplicated: ${chalk.green(
              existingWord,
            )} / ${chalk.green(word)}`,
          );
        }
      }
    }

    // Clear the custom words from the configuration.
    cSpellConfig.words = undefined;

    const { files } = cSpellConfig;
    if (files === undefined || files.length === 0) {
      fatalError(
        'The "files" property in the CSpell configuration file is either missing or has 0 elements. It is considered best practice to always have this field defined. If you want to spell check your entire project, you should change your configuration file to use:\n"files": ["**"]',
      );
    }

    for (const [i, file] of files.entries()) {
      assertString(
        file,
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        `Entry ${i} of the "cSpellConfig.files" array was not a string: ${file}`,
      );
    }
    const fileGlobs = files as string[];

    const misspelledWords: string[] = [];
    await lint(
      fileGlobs,
      {
        config: {
          settings: cSpellConfig,
          url,
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
              issue.uri === url.href
              && lowercaseWordsSet.has(issue.text.toLowerCase())
            )
          ) {
            misspelledWords.push(issue.text);
          }
        },
      },
    );

    if (this.verbose) {
      console.log("CSpell found the following misspelled words:\n");
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
        `Using a misspelled words set of ${misspelledWordsSet.size} entries:\n`,
      );
      for (const word of misspelledWordsSet) {
        console.log(word);
      }
      console.log();
    }

    // Check that each ignored word in the configuration file is actually being used.
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
      await autoFix(configPath, unusedWords, this.simple);
    }

    const exitCode = getExitCode(this.fix, unusedWords);
    process.exit(exitCode);
  }
}

/**
 * Because configuration files can have comments (in JavaScript or JSONC), we do not want to
 * overwrite the configuration file. Instead, we revert to manually removing the offending lines.
 */
async function autoFix(
  configPath: string,
  unusedWords: readonly string[],
  simple: boolean,
) {
  const configText = await readFile(configPath);
  if (configText.includes("\r\n")) {
    fatalError(
      `Your CSpell configuration file at "${configPath}" contains Windows-style newlines, which is not supported.`,
    );
  }

  // First, check to see if the words are on a single line.
  const singleLineArrayRegex = /(["']words["']\s*:\s*\[)(.*?)(])/;
  const singleLineMatch = configText.match(singleLineArrayRegex);

  if (singleLineMatch) {
    const [fullMatch, prefix, arrayContent, suffix] = singleLineMatch;

    assertDefined(arrayContent, "Failed to parse the single line words array.");

    const wordsArray = arrayContent
      .split(",")
      .map((item) => item.trim())
      .filter((item) => {
        const normalizedItem = item
          .replaceAll(/^["']|["']$/g, "")
          .toLowerCase();
        return !unusedWords.some(
          (word) => word.toLowerCase() === normalizedItem.toLowerCase(),
        );
      });

    const newArrayContent = wordsArray.join(", ");
    const newConfigText = configText.replace(
      fullMatch,
      `${prefix}${newArrayContent}${suffix}`,
    );

    await overwriteConfig(configPath, newConfigText, unusedWords, simple);
    return;
  }

  const lines = configText.split("\n");
  const newLines: string[] = [];

  const unusedWordsRegexes = unusedWords.map(
    (word) => new RegExp(`^(\\s*["']${word}["']\\s*,?\\s*)$`, "i"),
  );

  let insideWordsArray = false;
  let bracketDepth = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (/["']words["']\s*:\s*\[/.test(trimmedLine)) {
      insideWordsArray = true;
      bracketDepth = 1;
      newLines.push(line);
      continue;
    }

    if (insideWordsArray) {
      const openBrackets = (trimmedLine.match(/\[/g) ?? []).length;
      const closeBrackets = (trimmedLine.match(/]/g) ?? []).length;
      bracketDepth += openBrackets - closeBrackets;

      if (bracketDepth <= 0) {
        insideWordsArray = false;
      }
    }

    if (insideWordsArray) {
      const shouldSkip = unusedWordsRegexes.some((regex) =>
        regex.test(trimmedLine),
      );
      if (shouldSkip) {
        continue;
      }
    }

    newLines.push(line);
  }

  const newConfigText = newLines.join("\n");
  await overwriteConfig(configPath, newConfigText, unusedWords, simple);
}

async function overwriteConfig(
  configPath: string,
  newConfigText: string,
  unusedWords: readonly string[],
  simple: boolean,
) {
  const { ext } = path.parse(configPath);
  const language = trimPrefix(ext, ".");
  const repoRoot = path.dirname(configPath);
  const formattedText = await formatWithPrettier(
    newConfigText,
    language,
    repoRoot,
  );
  await writeFile(configPath, formattedText);

  if (!simple) {
    console.log(
      "Removed the following words from the CSpell configuration:",
      unusedWords,
    );
  }
}

function getExitCode(fix: boolean, unusedWords: readonly string[]) {
  if (fix) {
    return 0;
  }

  return unusedWords.length === 0 ? 0 : 1;
}
