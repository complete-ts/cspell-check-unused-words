# cspell-check-unused-words

<!-- markdownlint-disable MD033 -->

`cspell-check-unused-words` is a helper program for people who use [CSpell](https://cspell.org/). It will check your CSpell configuration file for unused words. You can use it in your project's linting pipeline to ensure that your project does not have any "orphaned" words.

## Install

Type the following command while in the root of your project:

```sh
npm install cspell-check-unused-words --save-dev
```

## Usage

Type the following command while in the root of your project:

```sh
npx cspell-check-unused-words
```

- It will return 0 if all of the words are currently being used.
- It will return 1 if there are one or more words that are unused. (It will also list the unused words in the standard output.)

## More Info

[CSpell](https://cspell.org/) is a fantastic tool that allows you to spell check your code. When using the [CSpell VSCode extension](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker), a blue squiggly line will appear underneath words that are misspelled.

Sometimes, these blue squiggly lines are false positives. When this is the case, you can right-click on the word and select "Spelling" --> "Add Words to CSpell Configuration". Doing this will automatically insert a new entry in your CSpell configuration file (which is usually something like "cspell.json").

Over time, the word ignore list in your configuration file will become quite large. But because of code changes, not all of the words may still serve a purpose. For example, the original code that caused a spelling error might have been removed or changed. In order to clean up your words, you need to audit every word to see if it is still being used.

`cspell-check-unused-words` does exactly this.

## Options

### --fix

- Type: `boolean`
- Default: `false`

If any unused words are found, the program will attempt to automatically remove them from the CSpell configuration file. If used, this option will change the exit code to always be 0.

### --simple

- Type: `boolean`
- Default: `false`

The default output is "The following word in the CSpell config is not being used: foo". If this flag is used, then only the names of the unused words will be printed out.

### --verbose

- Type: `boolean`
- Default: `false`

Enables more verbose logging, which is useful to see what the tool is doing at a closer level or for troubleshooting things when the tool is not working correctly.

### --workingDir

- Type: `string`
- Default: `process.cwd()`

By default, this tool will use the current working directory as a jumpoff point to look for the CSpell configuration and launch the CSpell lint run. You can use this option to specify the full path to a different directory as the jumpoff point.
