// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { isUndefined } from "../base/types";
import { BuiltinFunction, Factory, MethodArg } from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { registerPropertyProvider } from "../objects/propertyRegistry";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { TypeRegistry } from "../objects/typeRegistry";
import { evaluateSpecialMethod, method } from "./builtin-util";
import { defineGlobal } from "./globalProvider";
import { optional, required } from "./paramSpec";

const logika__awal__: MethodArg = [
  SpecialName.__awal__,
  ObjectUtil.wrapCallable((callsite, __, value) => {
    if (value.isInstance()) {
      const specialMethod = value.getProperty(SpecialName.__logika__);
      if (specialMethod) {
        return evaluateSpecialMethod(callsite, specialMethod, (returnValue) =>
          !returnValue.isBoolean()
            ? `bukan-logika (tipenya ${returnValue.typeName})`
            : undefined
        );
      }
    }
    return Factory.Boolean(value.isTruthy());
  }),
  undefined,
  [required("gue"), optional("nilai", Factory.Kosong)],
];
const logika__teks__: MethodArg = [
  SpecialName.__teks__,
  method.boolean(({ value }) => Factory.NewString(value ? "benar" : "salah")),
  undefined,
  [required("gue")],
];
const logika__daftarproperti__: MethodArg = [
  SpecialName.__daftarproperti__,
  ObjectUtil.wrapCallable(() =>
    Factory.NewList(
      boolenMethods.map((method) => Factory.NewString(method.name))
    )
  ),
  undefined,
];

const boolenMethods: BuiltinFunction[] = [
  Factory.NewBuiltinFunction(...logika__awal__),
  Factory.NewBuiltinFunction(...logika__teks__),
  Factory.NewBuiltinFunction(...logika__daftarproperti__),
];

registerPropertyProvider(SantaiType.kBoolean, (name, self) => {
  const method = boolenMethods.find((n) => n.name === name);
  if (isUndefined(method)) return undefined;
  return method.bindAndCopy(self);
});

defineGlobal("logika", () => {
  return TypeRegistry.registerType(
    Factory.NewBuiltinClass("logika", boolenMethods),
    SantaiType.kBoolean
  );
});
