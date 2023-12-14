import { Command } from "@commander-js/extra-typings";
import {
  dirName,
  getPackageJSON,
  getPackageJSONFieldMandatory,
} from "isaacscript-common-node";

const __dirname = dirName();
const packageJSON = getPackageJSON(__dirname);
const name = getPackageJSONFieldMandatory(packageJSON, "name");
const version = getPackageJSONFieldMandatory(packageJSON, "version");
const description = getPackageJSONFieldMandatory(packageJSON, "description");

export const program = new Command()
  .name(name)
  .description(`${description}.`)
  .version(version, "-V, --version", "Output the version number.")
  .helpOption("-h, --help", "Display the list of commands and options.")
  .addHelpCommand(false)
  .allowExcessArguments(false) // By default, Commander.js will allow extra positional arguments.
  .option("-v, --verbose", "Enable verbose output.", false);

const options = program.opts();
export type Options = typeof options;
