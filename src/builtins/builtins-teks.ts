// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { BuiltinFunction, Factory, MethodArg } from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { registerPropertyProvider } from "../objects/propertyRegistry";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { TypeRegistry } from "../objects/typeRegistry";
import { TokenValue } from "../parsing/token";
import { evaluateSpecialMethod, method } from "./builtin-util";
import { defineGlobal } from "./globalProvider";
import { optional, required } from "./paramSpec";

const teks__awal__: MethodArg = [
  SpecialName.__awal__,
  ObjectUtil.wrapCallable((callsite, __, value) => {
    if (value.isString()) return value;
    if (value.isInstance()) {
      const specialMethod = value.getProperty(SpecialName.__teks__);
      if (specialMethod) {
        return evaluateSpecialMethod(callsite, specialMethod, (returnValue) =>
          !returnValue.isString()
            ? `bukan-teks (tipenya ${returnValue.typeName})`
            : undefined
        );
      }
    }
    return Factory.NewString(value.inspect());
  }),
  undefined,
  [required("gue"), optional("nilai", Factory.NewString(""))],
];
const teks__teks__: MethodArg = [
  SpecialName.__teks__,
  method.string((self) => self),
  undefined,
  [required("gue")],
];
const teks__tambah__ = method.op(
  SantaiType.kString,
  "teks",
  SpecialName.__tambah__,
  TokenValue.kAdd
);
const teks_kapital: MethodArg = [
  "kapital",
  method.string(({ value }, all) => {
    const allWord = all.isBoolean() && all.isTruthy();

    const result = allWord
      ? value.replace(/\S+/g, (w) => w[0]!.toUpperCase() + w.slice(1))
      : value.replace(/\S/, (c) => c.toUpperCase());

    return Factory.NewString(result);
  }),
  undefined,
  [required("gue"), optional("semua", Factory.Boolean(false))],
];
const teks_gedein: MethodArg = [
  "gedein",
  method.string(({ value }) => Factory.NewString(value.toUpperCase())),
  undefined,
  [required("gue")],
];
const teks_kecilin: MethodArg = [
  "kecilin",
  method.string(({ value }) => Factory.NewString(value.toLowerCase())),
  undefined,
  [required("gue")],
];
const teks_rapiin: MethodArg = [
  "rapiin",
  method.string(({ value }) => Factory.NewString(value.trim())),
  undefined,
  [required("gue")],
];
const teks_diawali: MethodArg = [
  "diawali",
  method.string(({ value }, searchString) => {
    if (!searchString.isNumber() && !searchString.isString()) {
      return Factory.Boolean(false);
    }
    return Factory.Boolean(value.startsWith(searchString.value as string));
  }),
  undefined,
  [required("gue"), required("teks")],
];
const teks_diakhiri: MethodArg = [
  "diakhiri",
  method.string(({ value }, searchString) => {
    if (!searchString.isNumber() && !searchString.isString()) {
      return Factory.Boolean(false);
    }
    return Factory.Boolean(value.endsWith(searchString.value as string));
  }),
  undefined,
  [required("gue"), required("teks")],
];
const teks_karakter_ke: MethodArg = [
  "karakter_ke",
  method.string(({ value }, position) => {
    if (!position.isNumber()) {
      return Factory.NewString(value.charAt(0));
    }
    return Factory.NewString(value.charAt(position.value));
  }),
  undefined,
  [required("gue"), required("indeks")],
];
const teks_ganti: MethodArg = [
  "karakter_ke",
  method.string(({ value }, searchValue, replaceValue) => {
    const newValue = value.replace(
      searchValue.inspect(),
      replaceValue.inspect()
    );
    return Factory.NewString(newValue);
  }),
  undefined,
  [required("gue"), required("teks"), required("ganti")],
];
const teks_pisahin: MethodArg = [
  "pisahin",
  method.string(({ value }, pemisah, _limit) => {
    const limit = _limit.isNumber() ? _limit.value : undefined;
    const elements = value.split(pemisah.inspect(), limit);
    return Factory.NewList(elements.map((e) => Factory.NewString(e)));
  }),
  undefined,
  [
    required("gue"),
    required("pemisah"),
    optional("batas", Factory.NewNumber(-1)),
  ],
];
const teks_berisi: MethodArg = [
  "berisi",
  method.string(({ value }, searchString, _position) => {
    const position = _position.isNumber() ? _position.value : undefined;
    return Factory.Boolean(value.includes(searchString.inspect(), position));
  }),
  undefined,
  [required("gue"), required("teks"), optional("posisi", Factory.Kosong)],
];
const teks_mirip: MethodArg = [
  "mirip",
  method.string(({ value }, str) => {
    if (!str.isString()) {
      return Factory.Boolean(false);
    }
    return Factory.Boolean(value.toLowerCase() === str.value.toLowerCase());
  }),
  undefined,
  [required("gue"), required("teks")],
];
const teks_ulangin: MethodArg = [
  "ulangin",
  method.string(({ value }, count) => {
    return Factory.NewString(value.repeat(count.isNumber() ? count.value : 1));
  }),
  undefined,
  [required("gue"), required("jumlah")],
];
const teks_gabungin: MethodArg = [
  "gabungin",
  method.string(({ value: separator }, iter) => {
    if (!iter.isIterable()) return Factory.NewString("");
    const iterator = iter.iterate();
    return Factory.NewString(
      [...iterator].map((v) => v.inspect()).join(separator)
    );
  }),
  undefined,
  [required("gue"), required("iter")],
];
const teks_posisi: MethodArg = [
  "posisi",
  method.string(({ value }, _searchString, _position) => {
    const searchString = _searchString.inspect();
    const position = _position.isNumber() ? _position.value : undefined;
    return Factory.NewNumber(value.indexOf(searchString, position));
  }),
  undefined,
  [required("gue"), required("teks"), optional("posisi", Factory.Kosong)],
];
const teks_subteks: MethodArg = [
  "subteks",
  method.string(({ value }, _start, _end) => {
    const start = _start.isNumber() ? _start.value : 0;
    const end = _end.isNumber() ? _end.value : undefined;
    return Factory.NewString(value.substring(start, end));
  }),
  undefined,
  [required("gue"), required("mulai"), optional("akhir", Factory.Kosong)],
];
const teks__daftarproperti__: MethodArg = [
  SpecialName.__daftarproperti__,
  ObjectUtil.wrapCallable(() =>
    Factory.NewList(textMethods.map((method) => Factory.NewString(method.name)))
  ),
  undefined,
];

const textMethods: BuiltinFunction[] = [
  Factory.NewBuiltinFunction(...teks__awal__),
  Factory.NewBuiltinFunction(...teks__teks__),
  Factory.NewBuiltinFunction(...teks__tambah__),
  Factory.NewBuiltinFunction(...teks_kapital),
  Factory.NewBuiltinFunction(...teks_gedein),
  Factory.NewBuiltinFunction(...teks_kecilin),
  Factory.NewBuiltinFunction(...teks_rapiin),
  Factory.NewBuiltinFunction(...teks_diawali),
  Factory.NewBuiltinFunction(...teks_diakhiri),
  Factory.NewBuiltinFunction(...teks_karakter_ke),
  Factory.NewBuiltinFunction(...teks_ganti),
  Factory.NewBuiltinFunction(...teks_pisahin),
  Factory.NewBuiltinFunction(...teks_berisi),
  Factory.NewBuiltinFunction(...teks_mirip),
  Factory.NewBuiltinFunction(...teks_ulangin),
  Factory.NewBuiltinFunction(...teks_gabungin),
  Factory.NewBuiltinFunction(...teks_posisi),
  Factory.NewBuiltinFunction(...teks_subteks),
  Factory.NewBuiltinFunction(...teks__daftarproperti__),
];

registerPropertyProvider(SantaiType.kString, (name, self) => {
  const method = textMethods.find((n) => n.name === name);
  if (method) {
    method.bind(self);
  }
  return method;
});

defineGlobal("teks", () => {
  return TypeRegistry.registerType(
    Factory.NewBuiltinClass("teks", textMethods),
    SantaiType.kString
  );
});
