// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  BuiltinFunction,
  Factory,
  MethodArg,
  SantaiList,
  SantaiObject,
} from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { registerPropertyProvider } from "../objects/propertyRegistry";
import { createIterator } from "../objects/protocolIterator";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { TypeRegistry } from "../objects/typeRegistry";
import { asGetter, doIterator, mapParams, method } from "./builtin-util";
import { defineGlobal } from "./globalProvider";
import { optional, required } from "./paramSpec";

const daftar__awal__: MethodArg = [
  SpecialName.__awal__,
  ObjectUtil.wrapCallable((callsite, __, value) => {
    if (value.isList()) return value;
    if (value.isIterable()) {
      const elements: SantaiObject[] = [];
      const iterator = createIterator(callsite, value);
      doIterator(iterator, (item) => elements.push(item));
      return Factory.NewList(elements);
    }
    return Factory.NewList([value]);
  }),
  undefined,
  [required("gue"), optional("nilai", Factory.NewList([]))],
];
const daftar__teks__: MethodArg = [
  SpecialName.__teks__,
  method.list((self) => {
    const elements: readonly SantaiObject[] = self.elements;
    let str: string = "[";

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i] ?? Factory.Kosong;

      if (element.isString()) {
        str += "'" + element.inspect() + "'";
      } else {
        str += element.inspect();
      }

      if (i < elements.length - 1) {
        str += ", ";
      }
    }

    str += "]";
    return Factory.NewString(str);
  }),
  undefined,
  [required("gue")],
];
const daftar_tambah: MethodArg = [
  "tambah",
  method.list((self, ...args) => Factory.NewNumber(self.push(...args))),
  undefined,
  [required("gue"), required("item")],
];
const daftar_hapus: MethodArg = [
  "hapus",
  method.list((self, item) => {
    const index = self.elements.findIndex((e) => ObjectUtil.Equals(e, item));
    self.remove(index);
    return Factory.Kosong;
  }),
  undefined,
  [required("gue"), required("item")],
];
const daftar_hapus_ke: MethodArg = [
  "hapus_ke",
  method.list((self, position) => {
    const index = position.isNumber() ? position.value : -1;
    return self.remove(index);
  }),
  undefined,
  [required("gue"), required("posisi")],
];
const daftar_kosongin: MethodArg = [
  "kosongin",
  method.list((self) => {
    self.clear();
    return Factory.Kosong;
  }),
  undefined,
  [required("gue")],
];
const daftar_berisi: MethodArg = [
  "berisi",
  method.list((self, item) =>
    Factory.Boolean(
      self.elements.some((element) => ObjectUtil.Equals(element, item))
    )
  ),
  undefined,
  [required("gue"), required("item")],
];
const daftar_posisi: MethodArg = [
  "posisi",
  method.list((self, item) =>
    Factory.NewNumber(
      self.elements.findIndex((element) => ObjectUtil.Equals(element, item))
    )
  ),
  undefined,
  [required("gue"), required("item")],
];
const daftar_balik: MethodArg = [
  "balik",
  method.list((self) => self.reverse()),
  undefined,
  [required("gue")],
];
const daftar_unik: MethodArg = [
  "unik",
  method.list((self) => {
    const seen = new Set<string>();
    const result: SantaiObject[] = [];
    for (const el of self.elements) {
      const key = el.inspect();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(el);
      }
    }
    return Factory.NewList(result);
  }),
  undefined,
  [required("gue")],
];
const daftar_cariin: MethodArg = [
  "cariin",
  ObjectUtil.wrapMethod<SantaiList>({
    fn: (callsite, self, fn) => {
      if (!Factory.IsCallable(fn)) return Factory.Kosong;
      const elememts: readonly SantaiObject[] = self.elements;
      const result = elememts.find((element) => {
        return callsite.invoke(fn, [element]).isTruthy();
      });
      return result ? result : Factory.Kosong;
    },
    assertDescriptor: (callsite, self) =>
      ObjectUtil.checkObjectDescriptor(
        callsite,
        self,
        SantaiType.kList,
        "daftar"
      ),
  }),
  undefined,
  [required("gue"), required("aksi_cari")],
];

const list__daftarproperti__: MethodArg = [
  SpecialName.__daftarproperti__,
  ObjectUtil.wrapCallable(() =>
    Factory.NewList(listMethods.map((method) => Factory.NewString(method.name)))
  ),
  undefined,
];

const listMethods: BuiltinFunction[] = [
  Factory.NewBuiltinFunction(...daftar__awal__),
  Factory.NewBuiltinFunction(...daftar__teks__),
  Factory.NewBuiltinFunction(...daftar_tambah),
  Factory.NewBuiltinFunction(...daftar_hapus),
  Factory.NewBuiltinFunction(...daftar_hapus_ke),
  Factory.NewBuiltinFunction(...daftar_kosongin),
  Factory.NewBuiltinFunction(...daftar_berisi),
  Factory.NewBuiltinFunction(...daftar_posisi),
  Factory.NewBuiltinFunction(...daftar_balik),
  Factory.NewBuiltinFunction(...daftar_unik),
  Factory.NewBuiltinFunction(...daftar_cariin),
  Factory.NewBuiltinFunction(...list__daftarproperti__),
];

registerPropertyProvider(
  SantaiType.kList,
  asGetter(listMethods),
  mapParams(listMethods)
);

defineGlobal("daftar", () => {
  return TypeRegistry.registerType(
    Factory.NewBuiltinClass("daftar", SantaiType.kList, listMethods),
    SantaiType.kList
  );
});
