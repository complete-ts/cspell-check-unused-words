#!/usr/bin/env node

import { checkUnusedWords } from "./checkUnusedWords.js";
import { program } from "./parseArgs.js";

const options = program.parse().opts();
await checkUnusedWords(options);
