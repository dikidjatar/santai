// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { BugIndicatingError } from "./errors";

/**
 * Asserts that a condition is `truthy`.
 *
 * @throws provided {@linkcode messageOrError} if the {@linkcode condition} is `falsy`.
 *
 * @param condition The condition to assert.
 * @param messageOrError An error message or error object to throw if condition is `falsy`.
 */
export function assert(
  condition: boolean,
  messageOrError: string | Error = "unexpected state"
): asserts condition {
  if (!condition) {
    // if error instance is provided, use it, otherwise create a new one
    const errorToThrow =
      typeof messageOrError === "string"
        ? new BugIndicatingError(`Assertion Failed: ${messageOrError}`)
        : messageOrError;

    throw errorToThrow;
  }
}

/**
 * Ensures that a value is neither null nor undefined.
 */
export function assertDefined<T>(
  value: T,
  message = "expected value to be defined"
): asserts value is NonNullable<T> {
  assert(value !== null && value !== undefined, message);
}

export function assertNever(_value: never, message = "Unreachable"): never {
  throw new Error(message);
}

export function unreachable(): never {
  throw new Error("Unreachable");
}
