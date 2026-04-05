// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { SantaiFunction } from "./object";

const _registry = new Map<string, Map<string, SantaiFunction>>();

/**
 * Register an extension function.
 *
 * @param receiverName - As written in source.
 * @param methodName   - Extension method name.
 * @param fn           - The function with boundThis = undefined (unbound).
 */
export function registerExtension(
  receiverName: string,
  methodName: string,
  fn: SantaiFunction
): void {
  let methods = _registry.get(receiverName);
  if (methods === undefined) {
    methods = new Map();
    _registry.set(receiverName, methods);
  }

  // Last-write-wins. Allows re-definition
  methods.set(methodName, fn);
}

/**
 * Look up an unbound extension function.
 */
export function lookupExtension(
  name: string,
  methodName: string
): SantaiFunction | undefined {
  return _registry.get(name)?.get(methodName);
}
