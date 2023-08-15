import * as fs from "node:fs";
import { error } from "./utils.js";

export function fileExists(filePath: string): boolean {
  let pathExists: boolean;
  try {
    pathExists = fs.existsSync(filePath);
  } catch (error_) {
    error(`Failed to check if "${filePath}" exists:`, error_);
  }

  return pathExists;
}

export function readFile(filePath: string): string {
  let fileContents: string;
  try {
    fileContents = fs.readFileSync(filePath, "utf8");
  } catch (error_) {
    error(`Failed to read the "${filePath}" file:`, error_);
  }

  return fileContents;
}

export function writeFile(filePath: string, data: string): void {
  try {
    fs.writeFileSync(filePath, data);
  } catch (error_) {
    error(`Failed to write to the "${filePath}" file:`, error_);
  }
}
