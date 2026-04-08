// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * @returns whether the provided parameter is of type `object` but **not**
 *	`null`, an `array`, a `regexp`, nor a `date`.
 */
export function isObject(obj: unknown): obj is Object {
  // The method can't do a type cast since there are type (like strings) which
  // are subclasses of any put not positvely matched by the function. Hence type
  // narrowing results in wrong results.
  return (
    typeof obj === "object" &&
    obj !== null &&
    !Array.isArray(obj) &&
    !(obj instanceof RegExp) &&
    !(obj instanceof Date)
  );
}

export function isError(obj: unknown): obj is Error {
  return obj instanceof Error;
}

/**
 * @returns whether the provided parameter is undefined.
 */
export function isUndefined(obj: unknown): obj is undefined {
  return typeof obj === "undefined";
}

/**
 * @returns whether the provided parameter is undefined or null.
 */
export function isUndefinedOrNull(obj: unknown): obj is undefined | null {
  return isUndefined(obj) || obj === null;
}

/**
 * Abstract base class for signals that wrap a node of type T.
 * @template T The type of the node being wrapped by this signal.
 * @param node The node instance to be stored and accessed through this signal.
 */
export abstract class Signal<T> {
  constructor(readonly node: T) {}
}
