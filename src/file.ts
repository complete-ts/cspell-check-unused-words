import * as fs from "node:fs";
import { error } from "./utils.js";

export function fileExists(filePath: string): boolean {
  let pathExists: boolean;
  try {
    pathExists = fs.existsSync(filePath);
  } catch (err) {
    error(`Failed to check if "${filePath}" exists:`, err);
  }

  return pathExists;
}

export function readFile(filePath: string): string {
  let fileContents: string;
  try {
    fileContents = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    error(`Failed to read the "${filePath}" file:`, err);
  }

  return fileContents;
}

export function writeFile(filePath: string, data: string): void {
  try {
    fs.writeFileSync(filePath, data);
  } catch (err) {
    error(`Failed to write to the "${filePath}" file:`, err);
  }
}
