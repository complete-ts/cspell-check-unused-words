import path from "node:path";
import { getPackageJSONFieldsMandatory } from "./completeCommon.js";

const packageRoot = path.join(import.meta.dirname, "..");
const { name, version } = getPackageJSONFieldsMandatory(
  packageRoot,
  "name",
  "version",
);

export const PROJECT_NAME = name;
export const PROJECT_VERSION = version;
