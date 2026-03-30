// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { SantaiType } from "./st-type";

export interface PropertyTarget {
  readonly type: SantaiType;
}

export type PropertyGetter = (
  name: string,
  self: PropertyTarget
) => PropertyTarget | undefined;

const _registry = new Map<SantaiType, PropertyGetter>();

/**
 * Register a provider method for one type.
 */
export function registerPropertyProvider(
  type: SantaiType,
  getter: PropertyGetter
): void {
  _registry.set(type, getter);
}

/**
 * Lookup property — called by SantaiObject.getProperty().
 * Return undefined if the type does not have a provider or the name is not found.
 */
export function lookupProperty(
  type: SantaiType,
  name: string,
  self: PropertyTarget
): PropertyTarget | undefined {
  return _registry.get(type)?.(name, self);
}
