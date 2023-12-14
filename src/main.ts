#!/usr/bin/env node

import { isMain } from "isaacscript-common-node";
import { checkUnusedWords } from "./checkUnusedWords.js";
import { program } from "./parseArgs.js";

if (isMain()) {
  main();
}

function main() {
  const options = program.parse().opts();
  checkUnusedWords(options);
}
