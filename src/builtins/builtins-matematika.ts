// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { isString } from "../base/types";
import {
  BuiltinFunction,
  Callable,
  Factory,
  SantaiObject,
} from "../objects/object";
import { SantaiType } from "../objects/st-type";
import { defineGlobal } from "./globalProvider";
import { optional, required } from "./paramSpec";

defineGlobal("matematika", () => {
  return new (class extends SantaiObject {
    override readonly typeName: string = "matematika";
    private readonly _properties: Map<string, SantaiObject> = new Map();

    constructor() {
      super(SantaiType.kBuiltinClass);
      this.set(
        Factory.NewBuiltinFunction(
          "bulatin",
          this.wrap(this._bulatin),
          undefined,
          [required("angka"), optional("desimal", Factory.NewNumber(0))]
        )
      );
      this.set(
        Factory.NewBuiltinFunction(
          "bulatin_kebawah",
          this.wrap(this._bulatin_kebawah),
          undefined,
          [required("angka")]
        )
      );
    }

    private _bulatin(arg1: SantaiObject, arg2: SantaiObject): SantaiObject {
      const value = arg1.isNumber() ? arg1.value : 0;
      const desimal = arg2.isNumber() ? arg2.value : 0;
      const factor = 10 ** desimal;
      return Factory.NewNumber(Math.round(value * factor) / factor);
    }

    private _bulatin_kebawah(arg: SantaiObject): SantaiObject {
      const value = arg.isNumber() ? arg.value : 0;
      return Factory.NewNumber(Math.floor(value));
    }

    private wrap(fn: (...args: SantaiObject[]) => SantaiObject): Callable {
      return (_self: SantaiObject | undefined, args: SantaiObject[]) => {
        return fn.bind(this)(...args);
      };
    }

    private set(value: BuiltinFunction): void;
    private set(name: string, value: SantaiObject): void;
    private set(
      valueOrName: BuiltinFunction | string,
      value?: SantaiObject
    ): void {
      let name: string;
      if (isString(valueOrName)) {
        name = valueOrName;
      } else {
        name = valueOrName.name;
        value = valueOrName;
      }
      this._properties.set(name, value!);
    }

    override getProperty(name: string): SantaiObject | undefined {
      return this._properties.get(name);
    }

    override dir(): readonly string[] {
      return [...this._properties.keys()];
    }

    override isTruthy(): boolean {
      return true;
    }

    override inspect(): string {
      return "matematika { }";
    }
  })();
});
