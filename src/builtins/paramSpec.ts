// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { GlobalMethodParam, SantaiObject } from "../objects/object";

/**
 * Create mandatory parameters without default.
 * @example required("name")
 */
export function required(name: string): GlobalMethodParam {
  return { name };
}

/**
 * Create optional parameters with default values.
 * @example optional("value", Factory.NewNumber(1))
 */
export function optional<T extends SantaiObject>(
  name: string,
  defaultValue: T
): GlobalMethodParam {
  return { name, defaultValue };
}
