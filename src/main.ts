#!/usr/bin/env node

import chalk from "chalk";
import {
  deleteFileOrDirectory,
  fatalError,
  getJSONC,
  getPackageManagerExecCommand,
  getPackageManagerForProject,
  isFile,
  writeFile,
} from "isaacscript-common-node";
import { trimSuffix } from "isaacscript-common-ts";
import path from "node:path";
import sourceMapSupport from "source-map-support";
import {
  CSPELL_CONFIG_NAMES,
  CSPELL_TEMP_CONFIG_PATH,
  CWD,
} from "./constants.js";
import { execShell } from "./exec.js";

main();

function main() {
  sourceMapSupport.install();

  const cSpellConfigPath = getCSpellConfigPath();
  const cSpellConfig = getJSONC(cSpellConfigPath);
  const { words } = cSpellConfig;

  // Do nothing if they do not have a "words" array inside of the config.
  if (words === undefined) {
    return;
  }

  if (!Array.isArray(words)) {
    fatalError(
      `Failed to parse the "${chalk.green(
        "words",
      )}" property in the "${chalk.green(
        cSpellConfigPath,
      )}" file, since it was not an array.`,
    );
  }

  // Do nothing if the "words" array is empty.
  if (words.length === 0) {
    return;
  }

  for (const word of words) {
    if (typeof word !== "string") {
      fatalError(
        `Failed to parse the "${chalk.green(
          "words",
        )}" array in the "${chalk.green(
          cSpellConfigPath,
        )}" file, since one of the entires was of type: ${chalk.green(
          typeof word,
        )}`,
      );
    }
  }

  const wordsStrings = words as string[];
  const lowercaseWords = wordsStrings.map((word) => word.toLowerCase());

  // Delete all of the ignored words from the existing config. (Otherwise, the upcoming CSpell
  // command won't work properly.)
  cSpellConfig["words"] = undefined;

  // We have to add the "noConfigSearch" option:
  // https://github.com/streetsidesoftware/cspell/issues/4750
  cSpellConfig["noConfigSearch"] = true;

  const cSpellConfigWithoutWords = JSON.stringify(cSpellConfig);
  writeFile(CSPELL_TEMP_CONFIG_PATH, cSpellConfigWithoutWords);

  // Run CSpell without any of the ignored words.
  const packageManager = getPackageManagerForProject(CWD);
  const packageManagerExecCommand =
    getPackageManagerExecCommand(packageManager);
  const args = [
    "cspell",
    "--no-progress",
    "--no-summary",
    "--unique",
    "--words-only",
    "--config",
    CSPELL_TEMP_CONFIG_PATH,
  ];
  const { stdout } = execShell(packageManagerExecCommand, args);

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
    `Failed to find your CSpell configuration file in the current working directory: ${chalk.green(
      CWD,
    )}`,
  );
}
