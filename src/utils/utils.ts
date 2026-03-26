// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { Chars } from "../parsing/chars";

/**
 * Determines whether a value falls within a specified range (inclusive).
 *
 * @param value - The value to check.
 * @param lowerLimit - The lower boundary of the range (inclusive).
 * @param higherLimit - The upper boundary of the range (inclusive).
 * @returns `true` if the value is within the range, `false` otherwise.
 *
 * @example
 * ```typescript
 * isInRange(5, 0, 10); // true
 * isInRange(15, 0, 10); // false
 * ```
 */
export function isInRange(
  value: number,
  lowerLimit: number,
  higherLimit: number
): boolean {
  const range = (higherLimit - lowerLimit) >>> 0;
  const offset = (value - lowerLimit) >>> 0;
  return offset <= range;
}

export function asciiAlphaToLower(c: number): number {
  return c | 0x20;
}

export function isDecimalDigit(c: number): boolean {
  return isInRange(c, Chars.Zero, Chars.Nine);
}

export function isHexDigit(c: number): boolean {
  return (
    isDecimalDigit(c) ||
    isInRange(asciiAlphaToLower(c), Chars.LowerA, Chars.LowerF)
  );
}

export function isBinaryDigit(c: number): boolean {
  return c === Chars.Zero || c === Chars.One;
}

export function isOctalDigit(c: number): boolean {
  return isInRange(c, Chars.Zero, Chars.Seven);
}

export function isAlphaNumeric(c: number): boolean {
  return (
    isInRange(asciiAlphaToLower(c), Chars.LowerA, Chars.LowerZ) ||
    isDecimalDigit(c)
  );
}

export function isAsciiIdentifier(c: number): boolean {
  return isAlphaNumeric(c) || c === Chars.Underscore;
}

export function isStringLiteralLineTerminator(c: number): boolean {
  return c === 0x000a || c === 0x000d;
}

export function isLineTerminator(c: number): boolean {
  return c === 0x000a || c === 0x000d || c === 0x2028 || c === 0x2029;
}
