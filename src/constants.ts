import * as path from "node:path";

export const CWD = process.cwd();

const CSPELL_CONFIG_NAME = "cspell.json";
export const CSPELL_CONFIG_PATH = path.join(CWD, CSPELL_CONFIG_NAME);

const CSPELL_TEMP_CONFIG_NAME = "cspell.temp.json";
export const CSPELL_TEMP_CONFIG_PATH = path.join(CWD, CSPELL_TEMP_CONFIG_NAME);
