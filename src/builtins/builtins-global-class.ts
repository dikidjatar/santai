// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { isUndefined } from "../base/types";
import {
  Factory,
  GlobalMethodParam,
  SantaiError,
  SantaiObject,
} from "../objects/object";
import { SantaiType } from "../objects/st-type";
import { TypeRegistry } from "../objects/typeRegistry";
import { arg, arg0, defineAndRegisterGlobalClass } from "./builtin";
import { required } from "./paramSpec";

type ClassArg = [
  name: string,
  type: SantaiType,
  args: (args: SantaiObject[]) => SantaiObject,
  params?: readonly GlobalMethodParam[],
];

function intArg(args: SantaiObject[], idx: number): number | undefined {
  const v = args[idx];
  return v?.isNumber() ? Math.trunc(v.value) : undefined;
}

function Tipe(args: SantaiObject[]): SantaiObject {
  const obj: SantaiObject = arg0(args);

  if (obj.isInstance()) {
    return obj.getClass();
  }

  const cls = TypeRegistry.getTypeOf(obj);
  if (!isUndefined(cls)) {
    return cls;
  }

  return Factory.NewBuiltinClass(
    obj.typeName,
    SantaiType.kBuiltinClass,
    () => Factory.Kosong
  );
}

function Angka(args: SantaiObject[]): SantaiObject {
  const obj = arg0(args);

  if (obj.isNumber()) {
    return obj;
  }

  if (obj.isBoolean()) {
    return Factory.NewNumber(obj.value ? 1 : 0);
  }

  if (obj.isString()) {
    const n = Number(obj.value.trim());
    return Factory.NewNumber(isNaN(n) ? -1 : n);
  }

  return Factory.NewNumber(-1);
}

function Teks(args: SantaiObject[]): SantaiObject {
  const val = arg0(args);

  if (val.isString()) {
    return val;
  }

  return Factory.NewString(val.inspect());
}

function Logika(args: SantaiObject[]): SantaiObject {
  return Factory.Boolean(arg0(args).isTruthy());
}

function Daftar(args: SantaiObject[]): SantaiObject {
  const val = args[0] ?? Factory.Kosong;

  if (val.isList()) {
    return val;
  }

  if (val.isIterable()) {
    const iterator = val.iterate();
    const elements: SantaiObject[] = [];

    let result = iterator.next();

    while (!result.done) {
      elements.push(result.value);
      result = iterator.next();
    }

    return Factory.NewList(elements);
  }

  return Factory.NewList([val]);
}

function Rentang(args: SantaiObject[]): SantaiObject {
  let start: number;
  let stop: number;
  let step: number;

  const a0 = intArg(args, 0);
  const a1 = intArg(args, 1);
  const a2 = intArg(args, 2);

  if (isUndefined(a0)) {
    return Factory.NewRange(0, 0, 1);
  }

  if (isUndefined(a1)) {
    // rentang(stop)
    start = 0;
    stop = a0;
    step = stop >= 0 ? 1 : -1;
  } else {
    start = a0;
    stop = a1;
    step = a2 ?? (start <= stop ? 1 : -1);
  }

  if (step === 0) {
    // Step zero is infinite loop, reject by returning empty
    // an error will be thrown by the interpreter via kNotIterable if attempted
    return Factory.Kosong;
  }

  return Factory.NewRange(start, stop, step);
}

function Masalah(args: SantaiObject[]): SantaiObject {
  const message = arg(args, 0);
  const name = arg(args, 1);

  return new SantaiError(
    message.isString() ? message.value : "masalah tidak diketahui",
    name.isString() ? name.value : "Masalah"
  );
}

const tipe: ClassArg = [
  "tipe",
  SantaiType.kBuiltinClass,
  Tipe,
  [required("objek")],
];
const angka: ClassArg = ["angka", SantaiType.kNumber, Angka];
const teks: ClassArg = ["teks", SantaiType.kString, Teks];
const logika: ClassArg = ["logika", SantaiType.kBoolean, Logika];
const daftar: ClassArg = ["daftar", SantaiType.kList, Daftar];
const rentang: ClassArg = ["rentang", SantaiType.kRange, Rentang];
const masalah: ClassArg = ["Masalah", SantaiType.kError, Masalah];

defineAndRegisterGlobalClass(Factory.NewBuiltinClass(...tipe));
defineAndRegisterGlobalClass(Factory.NewBuiltinClass(...angka));
defineAndRegisterGlobalClass(Factory.NewBuiltinClass(...teks));
defineAndRegisterGlobalClass(Factory.NewBuiltinClass(...logika));
defineAndRegisterGlobalClass(Factory.NewBuiltinClass(...daftar));
defineAndRegisterGlobalClass(Factory.NewBuiltinClass(...rentang));
defineAndRegisterGlobalClass(Factory.NewBuiltinClass(...masalah));
