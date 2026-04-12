// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { isUndefined } from "../base/types";
import { BuiltinFunction, Factory, MethodArg } from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { registerPropertyProvider } from "../objects/propertyRegistry";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { TypeRegistry } from "../objects/typeRegistry";
import { method } from "./builtin-util";
import { defineGlobal } from "./globalProvider";
import { required } from "./paramSpec";

const tipe__awal__: MethodArg = [
  SpecialName.__awal__,
  method.type((self, object) => {
    if (object.isInstance()) {
      return object.getClass();
    }

    const cls = TypeRegistry.getTypeOf(object);
    if (!isUndefined(cls)) return cls;

    // console.log(object);
    return self;
  }),
  undefined,
  [required("gue"), required("objek")],
];
const tipe__daftarproperti__: MethodArg = [
  SpecialName.__daftarproperti__,
  ObjectUtil.wrapCallable(() =>
    Factory.NewList(typeMethods.map((method) => Factory.NewString(method.name)))
  ),
  undefined,
];

const typeMethods: BuiltinFunction[] = [
  Factory.NewBuiltinFunction(...tipe__awal__),
  Factory.NewBuiltinFunction(...tipe__daftarproperti__),
];

registerPropertyProvider(SantaiType.kBuiltinClass, (name, self) => {
  const method = typeMethods.find((n) => n.name === name);
  if (method) {
    method.bind(self);
  }
  return method;
});

defineGlobal("tipe", () => {
  return TypeRegistry.registerType(
    Factory.NewBuiltinClass("tipe", typeMethods),
    SantaiType.kBuiltinClass
  );
});
