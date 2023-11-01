import * as path from "node:path";

export const CWD = process.cwd();

export const CSPELL_CONFIG_NAMES = ["cspell.json", "cspell.jsonc"] as const;

const CSPELL_TEMP_CONFIG_NAME = "cspell.temp.jsonc";
export const CSPELL_TEMP_CONFIG_PATH = path.join(CWD, CSPELL_TEMP_CONFIG_NAME);
