// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { Callable, Factory, SantaiObject } from "../objects/object";
import {
  PropertyGetter,
  PropertyTarget,
  registerPropertyProvider,
} from "../objects/propertyRegistry";
import { SantaiType } from "../objects/st-type";
import { BuiltinParam } from "./paramSpec";

interface MethodItem {
  readonly callable: Callable;
  readonly params?: readonly BuiltinParam[];
}

export class MethodTable {
  private readonly _methods = new Map<string, MethodItem>();

  define(
    name: string,
    callable: Callable,
    params?: readonly BuiltinParam[]
  ): this {
    this._methods.set(name, { callable, params });
    return this;
  }

  /**
   * Create a PropertyGetter that can be registered with the registry.
   * Cast to SantaiObject here is safe because we are just registering
   * This table is for a type that is CasualObject.
   */
  asGetter(): PropertyGetter {
    return (name: string, self: PropertyTarget) => {
      const item = this._methods.get(name);
      if (!item) {
        return undefined;
      }
      return Factory.NewBuiltinFunction(
        name,
        item.callable,
        self as SantaiObject,
        item.params
      );
    };
  }

  /**
   * Register this table to the global registry for a specific type.
   * Called once when the module is loaded.
   */
  registerFor(type: SantaiType): this {
    registerPropertyProvider(type, this.asGetter());
    return this;
  }
}
