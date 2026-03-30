// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { Factory, SantaiObject } from "../objects/object";
import {
  PropertyGetter,
  PropertyTarget,
  registerPropertyProvider,
} from "../objects/propertyRegistry";
import { SantaiType } from "../objects/st-type";
import { BuiltinCallable } from "./builtin";

export class MethodTable {
  private readonly _methods = new Map<string, BuiltinCallable>();

  define(name: string, callable: BuiltinCallable): this {
    this._methods.set(name, callable);
    return this;
  }

  /**
   * Create a PropertyGetter that can be registered with the registry.
   * Cast to RelaxObject here is safe because we are just registering
   * This table is for a type that is CasualObject.
   */
  asGetter(): PropertyGetter {
    return (name: string, self: PropertyTarget) => {
      const callable = this._methods.get(name);
      if (!callable) {
        return undefined;
      }
      return Factory.NewBuiltinFunction(name, callable, self as SantaiObject);
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
