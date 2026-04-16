// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert, assertNever } from "../base/asserts";
import { MessageTemplate } from "../base/messageTemplate";
import { isUndefined } from "../base/types";
import { BuiltinFunction, Factory, MethodArg } from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { registerPropertyProvider } from "../objects/propertyRegistry";
import { coerceToString } from "../objects/protocol";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { TypeRegistry } from "../objects/typeRegistry";
import { mapParams } from "./builtin-util";
import { defineGlobal } from "./globalProvider";
import { required } from "./paramSpec";

const Pasangan__awal__: MethodArg = [
  SpecialName.__awal__,
  ObjectUtil.wrapCallable((callsite, _self, id, value) => {
    if (!id.isString() && !id.isNumber()) {
      assertNever(
        callsite.throw(
          MessageTemplate.kTypeError,
          "id harus berupa teks atau angka tetapi yang diberikan %s",
          id.typeName
        )
      );
    }

    return Factory.NewPair(id.value.toString(), value);
  }),
  undefined,
  [required("gue"), required("id"), required("nilai")],
];
const Pasangan__teks__: MethodArg = [
  SpecialName.__teks__,
  ObjectUtil.wrapMethod({
    fn: (callsite, self) => {
      assert(self.isPair());
      return Factory.NewString(
        `Pasang { id: ${self.id}, nilai: ${coerceToString(callsite, self.value)} }`
      );
    },
    assertDescriptor: (callsite, self) =>
      ObjectUtil.checkObjectDescriptor(
        callsite,
        self,
        SantaiType.kPair,
        "Pasang"
      ),
  }),
  undefined,
  [required("gue")],
];
const Pasangan__daftarproperti__: MethodArg = [
  SpecialName.__daftarproperti__,
  ObjectUtil.wrapCallable(() => {
    return Factory.NewList([
      ...PasanganMethods.map((method) => Factory.NewString(method.name)),
      Factory.NewString("id"),
      Factory.NewString("nilai"),
    ]);
  }),
  undefined,
  [required("gue")],
];

const PasanganMethods: BuiltinFunction[] = [
  Factory.NewBuiltinFunction(...Pasangan__awal__),
  Factory.NewBuiltinFunction(...Pasangan__teks__),
  Factory.NewBuiltinFunction(...Pasangan__daftarproperti__),
];

registerPropertyProvider(
  SantaiType.kPair,
  (name, self) => {
    assert(self.isPair());
    if (name === "id") return Factory.NewString(self.id);
    if (name === "nilai") return self.value;
    const method = PasanganMethods.find((n) => n.name === name);
    if (isUndefined(method)) return undefined;
    return method.bindAndCopy(self);
  },
  mapParams(PasanganMethods)
);

defineGlobal("Pasang", () =>
  TypeRegistry.registerType(
    Factory.NewBuiltinClass("Pasang", SantaiType.kPair, PasanganMethods),
    SantaiType.kPair
  )
);
