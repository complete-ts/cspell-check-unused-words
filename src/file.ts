import * as fs from "node:fs";
import { fatalError } from "./utils.js";

export function fileExists(filePath: string): boolean {
  let pathExists: boolean;
  try {
    pathExists = fs.existsSync(filePath);
  } catch (error) {
    fatalError(`Failed to check if "${filePath}" exists:`, error);
  }

  return pathExists;
}

export function readFile(filePath: string): string {
  let fileContents: string;
  try {
    fileContents = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    fatalError(`Failed to read the "${filePath}" file:`, error);
  }

  return fileContents;
}

export function writeFile(filePath: string, data: string): void {
  try {
    fs.writeFileSync(filePath, data);
  } catch (error) {
    fatalError(`Failed to write to the "${filePath}" file:`, error);
  }
}
