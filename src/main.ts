#!/usr/bin/env node

import { Builtins, Cli } from "clipanion";
import { CheckCommand } from "./CheckCommand.js";
import { PROJECT_NAME, PROJECT_VERSION } from "./constants.js";

await main();

async function main() {
  const [_node, _app, ...args] = process.argv;

  const cli = new Cli({
    binaryLabel: PROJECT_NAME,
    binaryName: PROJECT_NAME,
    binaryVersion: PROJECT_VERSION,
  });

  cli.register(CheckCommand);

  cli.register(Builtins.HelpCommand);
  cli.register(Builtins.VersionCommand);

  await cli.runExit(args);
}
