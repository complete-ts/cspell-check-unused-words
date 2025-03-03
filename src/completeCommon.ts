// These functions are from "complete-common". We do not want to depend on this library directly
// because the "complete" monorepo depends on this one, which would cause a circular dependency.
// Additionally, it would cause this library to exist in the "node_modules" directory of the
// monorepo, which causes scripts to use the compiled version of the library instead of the one
// specified in the tsconfig paths.

export type ReadonlyRecord<K extends string | number | symbol, V> = Readonly<
  Record<K, V>
>;

/**
 * Helper function to throw an error if the provided value is equal to `undefined`.
 *
 * This is useful to have TypeScript narrow a `T | undefined` value to `T` in a concise way.
 */
export function assertDefined<T>(
  value: T,
  ...[msg]: [undefined] extends [T]
    ? [string]
    : [
        "The assertion is useless because the provided value does not contain undefined.",
      ]
): asserts value is Exclude<T, undefined> {
  if (value === undefined) {
    throw new TypeError(msg);
  }
}

/**
 * Helper function to narrow an unknown value to an object (i.e. a TypeScript record).
 *
 * Under the hood, this checks for `typeof variable === "object"`, `variable !== null`, and
 * `!Array.isArray(variable)`.
 */
export function isObject(
  variable: unknown,
): variable is Record<string, unknown> {
  return (
    typeof variable === "object"
    && variable !== null
    && !Array.isArray(variable)
  );
}

/** Helper function to trim a suffix from a string, if it exists. Returns the trimmed string. */
export function trimSuffix(string: string, prefix: string): string {
  if (!string.endsWith(prefix)) {
    return string;
  }

  const endCharacter = string.length - prefix.length;
  return string.slice(0, endCharacter);
}
