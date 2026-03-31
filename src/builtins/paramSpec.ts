// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

/**
 * One parameter descriptor for builtin functions.
 */
export interface BuiltinParam {
  readonly name: string;
  /**
   * `undefined`     = mandatory parameter, must be filled with caller
   * `SantaiObject`  = Optional, use this value if not filled
   */
  readonly defaultValue?: unknown;
}

/**
 * Create mandatory parameters without default.
 * @example required("name")
 */
export function required(name: string): BuiltinParam {
  return { name };
}

/**
 * Create optional parameters with default values.
 * @example optional("value", Factory.NewNumber(1))
 */
export function optional<T>(name: string, defaultValue: T): BuiltinParam {
  return { name, defaultValue };
}
