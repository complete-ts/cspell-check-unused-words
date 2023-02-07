import * as path from "node:path";

export const CWD = process.cwd();

const CSPELL_CONFIG_NAME = "cspell.json";
export const CSPELL_CONFIG_PATH = path.join(CWD, CSPELL_CONFIG_NAME);
