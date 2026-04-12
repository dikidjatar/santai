// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  BuiltinFunction,
  Factory,
  MethodArg,
  SantaiError,
} from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { registerPropertyProvider } from "../objects/propertyRegistry";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { TypeRegistry } from "../objects/typeRegistry";
import { method } from "./builtin-util";
import { defineGlobal } from "./globalProvider";
import { optional, required } from "./paramSpec";

const Masalah__awal__: MethodArg = [
  SpecialName.__awal__,
  ObjectUtil.wrapCallable((_, __, message, name) => {
    return new SantaiError(
      message.isString() ? message.value : "masalah tidak diketahui",
      name.isString() ? name.value : "Masalah"
    );
  }),
  undefined,
  [
    required("gue"),
    required("pesan"),
    optional("nama", Factory.NewString("Masalah")),
  ],
];
const Masalah__teks__: MethodArg = [
  SpecialName.__teks__,
  method.error((self) => Factory.NewString(`${self.name}: ${self.message}`)),
  undefined,
  [required("gue")],
];
const Masalah__daftarproperti__: MethodArg = [
  SpecialName.__daftarproperti__,
  ObjectUtil.wrapCallable(() =>
    Factory.NewList(
      MasalahMethods.map((method) => Factory.NewString(method.name))
    )
  ),
  undefined,
];

const MasalahMethods: BuiltinFunction[] = [
  Factory.NewBuiltinFunction(...Masalah__awal__),
  Factory.NewBuiltinFunction(...Masalah__teks__),
  Factory.NewBuiltinFunction(...Masalah__daftarproperti__),
];

registerPropertyProvider(SantaiType.kError, (name, self) => {
  const method = MasalahMethods.find((n) => n.name === name);
  if (method) {
    method.bind(self);
  }
  return method;
});

defineGlobal("Masalah", () => {
  return TypeRegistry.registerType(
    Factory.NewBuiltinClass("Masalah", MasalahMethods),
    SantaiType.kError
  );
});
