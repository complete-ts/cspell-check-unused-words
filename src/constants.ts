import path from "node:path";
import { getPackageJSONFieldsMandatory } from "./completeNode.js";

export const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..");

const { name, version } = await getPackageJSONFieldsMandatory(
  PACKAGE_ROOT,
  "name",
  "version",
);

export const PROJECT_NAME = name;
export const PROJECT_VERSION = version;
