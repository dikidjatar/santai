// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { SantaiBuiltinClass, SantaiObject } from "./object";
import { SantaiType } from "./st-type";

const typeRegistry = new Map<SantaiType, SantaiBuiltinClass>();

/**
 * Register `SantaiBuiltinClass`
 */
export function register(cls: SantaiBuiltinClass): SantaiBuiltinClass {
  typeRegistry.set(cls.santaiType, cls);
  return cls;
}

/**
 * Returns a `SantaiBuiltinClass` corresponding to type `obj`.
 * Used by builtin `tipe()`:
 */
export function getBuiltinClassOf(
  obj: SantaiObject
): SantaiBuiltinClass | undefined {
  return typeRegistry.get(obj.type);
}
