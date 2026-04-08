// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  BuiltinFunction,
  Callable,
  Factory,
  GlobalMethodParam,
  SantaiObject,
} from "../objects/object";
import {
  PropertyGetter,
  registerPropertyProvider,
} from "../objects/propertyRegistry";
import { SantaiType } from "../objects/st-type";

export class MethodTable {
  private readonly _methods = new Map<string, BuiltinFunction>();

  define(
    name: string,
    callable: Callable,
    params?: readonly GlobalMethodParam[]
  ): this {
    const method = Factory.NewBuiltinFunction(
      name,
      callable,
      undefined,
      params
    );
    this._methods.set(name, method);
    return this;
  }

  /**
   * Register this table to the global registry for a specific type.
   * Called once when the module is loaded.
   */
  registerFor(type: SantaiType): this {
    const names = Array.from(this._methods.keys());
    registerPropertyProvider(type, this.asGetter(), names);
    return this;
  }

  /**
   * Create a PropertyGetter that can be registered with the registry.
   */
  private asGetter(): PropertyGetter {
    return (name: string, self: SantaiObject) => {
      const method = this._methods.get(name);
      if (method) method.bind(self);
      return method;
    };
  }
}
