// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert } from "../base/asserts";
import { MessageTemplate } from "../base/messageTemplate";
import {
  BuiltinFunction,
  Factory,
  MethodArg,
  SantaiObject,
  SantaiPair,
} from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { registerPropertyProvider } from "../objects/propertyRegistry";
import { coerceToString } from "../objects/protocol";
import { createIterator } from "../objects/protocolIterator";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { TypeRegistry } from "../objects/typeRegistry";
import { asGetter, doIterator, mapParams, method } from "./builtin-util";
import { defineGlobal } from "./globalProvider";
import { optional, required } from "./paramSpec";

function getId(value: SantaiObject): string {
  if (value.isString()) return value.value;
  if (value.isNumber()) return value.value.toString();
  return "";
}

const Peta__awal__: MethodArg = [
  SpecialName.__awal__,
  ObjectUtil.wrapCallable((callsite, _, rawPairs) => {
    if (!rawPairs.isIterable()) {
      callsite.throw(MessageTemplate.kNotIterable, rawPairs.typeName);
    }
    const pairs: SantaiPair[] = [];
    const iterator = createIterator(callsite, rawPairs);
    doIterator(iterator, (pair) => {
      if (!pair.isPair()) return;
      pairs.push(pair);
    });
    return Factory.NewMap(pairs);
  }),
  undefined,
  [required("gue"), optional("pasangan", Factory.NewList([]))],
];
const Peta__teks__: MethodArg = [
  SpecialName.__teks__,
  ObjectUtil.wrapMethod({
    fn: (callsite, self) => {
      assert(self.isMap());
      const entries = Array.from(self.getEntries())
        .map(([, v]) => coerceToString(callsite, v) ?? "")
        .join(", ");
      return Factory.NewString(`Peta { ${entries} }`);
    },
    assertDescriptor: (callsite, self) =>
      ObjectUtil.checkObjectDescriptor(callsite, self, SantaiType.kMap, "Peta"),
  }),
  undefined,
  [required("gue")],
];
const Peta__panjang__: MethodArg = [
  SpecialName.__panjang__,
  method.map((self) => Factory.NewNumber(self.size)),
  undefined,
  [required("gue")],
];
const Peta__ambil__: MethodArg = [
  SpecialName.__ambil__,
  method.map((self, id) => {
    const pair = self.getPair(getId(id));
    return pair ? pair.value : Factory.Kosong;
  }),
  undefined,
  [required("gue"), required("id")],
];
const Peta__atur__: MethodArg = [
  SpecialName.__atur__,
  method.map((self, id, value) => {
    const pair = Factory.NewPair(getId(id), value);
    self.setValue(pair.id, pair);
    return pair;
  }),
  undefined,
  [required("gue"), required("id"), required("nilai")],
];
const Peta_ambilin: MethodArg = [
  "ambilin",
  method.map((self, id) => {
    const pair = self.getPair(getId(id));
    return pair ? pair.value : Factory.Kosong;
  }),
  undefined,
  [required("gue"), required("id")],
];
const Peta_isiin: MethodArg = [
  "isiin",
  method.map((self, id, value) => {
    const pair = Factory.NewPair(getId(id), value);
    self.setValue(pair.id, pair);
    return Factory.Kosong;
  }),
  undefined,
  [required("gue"), required("id"), required("nilai")],
];
const Peta_hapusin: MethodArg = [
  "hapusin",
  method.map((self, id) => {
    return Factory.Boolean(self.delete(getId(id)));
  }),
  undefined,
  [required("gue"), required("id")],
];
const Peta_bersihin: MethodArg = [
  "bersihin",
  method.map((self) => {
    self.clear();
    return Factory.Kosong;
  }),
  undefined,
  [required("gue")],
];

const PetaMethods: BuiltinFunction[] = [
  Factory.NewBuiltinFunction(...Peta__awal__),
  Factory.NewBuiltinFunction(...Peta__teks__),
  Factory.NewBuiltinFunction(...Peta__panjang__),
  Factory.NewBuiltinFunction(...Peta__ambil__),
  Factory.NewBuiltinFunction(...Peta__atur__),
  Factory.NewBuiltinFunction(...Peta_ambilin),
  Factory.NewBuiltinFunction(...Peta_isiin),
  Factory.NewBuiltinFunction(...Peta_hapusin),
  Factory.NewBuiltinFunction(...Peta_bersihin),
];

registerPropertyProvider(
  SantaiType.kMap,
  asGetter(PetaMethods),
  mapParams(PetaMethods)
);

defineGlobal("Peta", () =>
  TypeRegistry.registerType(
    Factory.NewBuiltinClass("Peta", SantaiType.kMap, PetaMethods),
    SantaiType.kMap
  )
);
