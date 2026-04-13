// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { isUndefined } from "../base/types";
import {
  BuiltinFunction,
  Factory,
  MethodArg,
  SantaiObject,
} from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { registerPropertyProvider } from "../objects/propertyRegistry";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { TypeRegistry } from "../objects/typeRegistry";
import { asGetter, mapParams, method } from "./builtin-util";
import { defineGlobal } from "./globalProvider";
import { optional, required } from "./paramSpec";

function intArg(value: SantaiObject): number | undefined {
  return value.isNumber() ? Math.trunc(value.value) : undefined;
}

function Rentang(
  _start: SantaiObject,
  _stop: SantaiObject,
  _step: SantaiObject
): SantaiObject {
  let start: number;
  let stop: number;
  let step: number;

  const a0 = intArg(_start);
  const a1 = intArg(_stop);
  const a2 = intArg(_step);

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

const rentang__awal__: MethodArg = [
  SpecialName.__awal__,
  ObjectUtil.wrapCallable((_, __, start, stop, step) =>
    Rentang(start, stop, step)
  ),
  undefined,
  [
    required("gue"),
    optional("mulai", Factory.Kosong),
    optional("akhir", Factory.Kosong),
    optional("langkah", Factory.Kosong),
  ],
];
const rentang__teks__: MethodArg = [
  SpecialName.__teks__,
  method.range((self) => {
    if (self.step === 1) {
      return Factory.NewString(
        self.start === 0
          ? `rentang(${self.stop})`
          : `rentang(${self.start}, ${self.stop})`
      );
    }

    return Factory.NewString(
      `rentang(${self.start}, ${self.stop}, ${self.step})`
    );
  }),
  undefined,
  [required("gue")],
];
const rentang_loncat: MethodArg = [
  "loncat",
  method.range((self, number) => {
    const step: number = number.isNumber() ? number.value : self.step;
    return Factory.NewRange(self.start, self.stop, step);
  }),
  undefined,
  [required("gue"), required("angka")],
];
const rentang__daftarproperti__: MethodArg = [
  SpecialName.__daftarproperti__,
  ObjectUtil.wrapCallable(() =>
    Factory.NewList(
      rangeMethods.map((method) => Factory.NewString(method.name))
    )
  ),
  undefined,
];

const rangeMethods: BuiltinFunction[] = [
  Factory.NewBuiltinFunction(...rentang__awal__),
  Factory.NewBuiltinFunction(...rentang__teks__),
  Factory.NewBuiltinFunction(...rentang_loncat),
  Factory.NewBuiltinFunction(...rentang__daftarproperti__),
];

registerPropertyProvider(
  SantaiType.kRange,
  asGetter(rangeMethods),
  mapParams(rangeMethods)
);

defineGlobal("rentang", () => {
  return TypeRegistry.registerType(
    Factory.NewBuiltinClass("rentang", SantaiType.kRange, rangeMethods),
    SantaiType.kRange
  );
});
