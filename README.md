# cspell-check-unused-words

<!-- markdownlint-disable MD033 -->

`cspell-check-unused-words` is a helper program for people who use [CSpell](https://cspell.org/). It will check your CSpell configuration file for unused words. You can use it in your project's linting pipeline to ensure that your project does not have any "orphaned" words.

## Install

```sh
npm install cspell-check-unused-words --save-dev
```

## Usage

Type the following command while in the root of your project:

```sh
npx cspell-check-unused-words
```

- It will return 0 if all of the words are currently being used.
- It will return 1 if there are one or more words that are unused.

## More Info

[CSpell](https://cspell.org/) is a fantastic tool that allows you to spell check your code. When using the [CSpell VSCode extension](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker), a blue squiggly line will appear underneath words that are misspelled.

Sometimes, these blue squiggly lines are false positives. When this is the case, you can right-click on the word and select "Spelling" --> "Add Words to CSpell Configuration". Doing this will automatically insert a new entry in the "cspell.json" file.

Over time, the word ignore list in the "cspell.json" file will become quite large. But because of code changes, not all of the words may still serve a purpose. For example, the original code that caused a spelling error might have been removed or changed. In order to clean up your words, you need to check every word to see if it is still being used.

This is where `cspell-check-unused-words` comes in. It will check every word in your configuration to ensure that it is still being used.
