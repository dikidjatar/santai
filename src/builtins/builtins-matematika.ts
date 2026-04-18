// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  BuiltinFunction,
  Factory,
  GlobalMethodParam,
  SantaiObject,
} from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { registerPropertyProvider } from "../objects/propertyRegistry";
import { createIterator } from "../objects/protocolIterator";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { asGetter, getNumber, mapParams, wrapMethod } from "./builtin-util";
import { defineGlobal } from "./globalProvider";
import { required } from "./paramSpec";

class Matematika extends SantaiObject {
  override readonly typeName: string = "matematika";
  private readonly _properties: Map<string, SantaiObject> = new Map();

  get propertiNames(): string[] {
    return [...this._properties.keys()];
  }

  constructor() {
    super(SantaiType.kMath);
    this._properties.set("PI", Factory.NewNumber(Math.PI));
    this._properties.set("E", Factory.NewNumber(Math.E));
    this._properties.set("LN2", Factory.NewNumber(Math.LN2));
    this._properties.set("LN10", Factory.NewNumber(Math.LN10));
    this._properties.set("LOG10E", Factory.NewNumber(Math.LOG10E));
    this._properties.set("LOG2E", Factory.NewNumber(Math.LOG2E));
    this._properties.set("SQRT1_2", Factory.NewNumber(Math.SQRT1_2));
    this._properties.set("SQRT2", Factory.NewNumber(Math.SQRT2));
  }

  override getProperty(name: string): SantaiObject | undefined {
    const property = this._properties.get(name);
    if (property) return property;
    return super.getProperty(name);
  }
}

function method(
  name: string,
  fn: (self: Matematika, ...args: SantaiObject[]) => SantaiObject,
  params?: GlobalMethodParam[]
): BuiltinFunction {
  return Factory.NewBuiltinFunction(
    name,
    wrapMethod(SantaiType.kMath, "matematika", fn),
    undefined,
    [required("gue"), ...(params ? params : [])]
  );
}

type MathKey =
  | "round"
  | "floor"
  | "ceil"
  | "cos"
  | "cosh"
  | "sin"
  | "sinh"
  | "tan"
  | "exp"
  | "expm1"
  | "sqrt"
  | "abs"
  | "acos"
  | "acosh"
  | "asin"
  | "asinh"
  | "atan"
  | "atanh"
  | "cbrt"
  | "clz32"
  | "f16round"
  | "fround"
  | "log"
  | "log10"
  | "log1p"
  | "log2"
  | "sign"
  | "trunc";

function math(name: MathKey) {
  return method(
    name as string,
    (_, value) => Factory.NewNumber(Math[name](getNumber(value))),
    [required("nilai")]
  );
}

function mathMinOrMax(name: "min" | "max"): BuiltinFunction {
  return Factory.NewBuiltinFunction(
    name,
    ObjectUtil.wrapMethod({
      fn: (callsite, _, values) => {
        if (!values.isIterable()) {
          return Factory.NewNumber(0);
        }
        const iterator = createIterator(callsite, values);
        const result = Math[name](
          ...[...iterator].map((value) => {
            if (!value.isNumber()) return NaN;
            return value.value;
          })
        );
        return Factory.NewNumber(isNaN(result) ? 0 : result);
      },
      assertDescriptor: (callsite, self) =>
        ObjectUtil.checkObjectDescriptor(
          callsite,
          self,
          SantaiType.kMath,
          "matematika"
        ),
    }),
    undefined,
    [required("gue"), required("nilai")]
  );
}

const mathMethods: BuiltinFunction[] = [
  Factory.NewBuiltinFunction(
    SpecialName.__awal__,
    ObjectUtil.wrapCallable(() => new Matematika()),
    undefined,
    [required("gue")]
  ),
  method(SpecialName.__teks__, () => Factory.NewString("matematika {}")),
  method(SpecialName.__logika__, () => Factory.True),
  method(SpecialName.__daftarproperti__, (self) => {
    const methodNames = mapParams(mathMethods);
    const propertyNames = self.propertiNames;
    return Factory.NewList(
      [...propertyNames, ...methodNames].map((name) => Factory.NewString(name))
    );
  }),
  method(
    "pow",
    (_, x, y) => Factory.NewNumber(Math.pow(getNumber(x), getNumber(y))),
    [required("x"), required("y")]
  ),
  method("random", () => Factory.NewNumber(Math.random())),
  math("round"),
  math("floor"),
  math("ceil"),
  math("cos"),
  math("cosh"),
  math("sin"),
  math("sinh"),
  math("tan"),
  math("exp"),
  math("expm1"),
  math("sqrt"),
  math("abs"),
  math("acos"),
  math("acosh"),
  math("asin"),
  math("asinh"),
  math("atan"),
  math("atanh"),
  math("cbrt"),
  math("clz32"),
  math("f16round"),
  math("fround"),
  math("log"),
  math("log10"),
  math("log1p"),
  math("log2"),
  math("sign"),
  math("trunc"),
  mathMinOrMax("min"),
  mathMinOrMax("max"),
];

registerPropertyProvider(
  SantaiType.kMath,
  asGetter(mathMethods),
  mapParams(mathMethods)
);

defineGlobal("matematika", () => new Matematika());
