// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { isUndefined } from "../base/types";
import { BuiltinFunction, Factory, MethodArg } from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { registerPropertyProvider } from "../objects/propertyRegistry";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { TypeRegistry } from "../objects/typeRegistry";
import { TokenValue } from "../parsing/token";
import { evaluateObjectSpecialMethod, method } from "./builtin-util";
import { defineGlobal } from "./globalProvider";
import { optional, required } from "./paramSpec";

const angka__awal__: MethodArg = [
  SpecialName.__awal__,
  ObjectUtil.wrapCallable((callsite, __, value) => {
    if (value.isNumber()) {
      return value;
    }

    if (value.isBoolean()) {
      return Factory.NewNumber(value.value ? 1 : 0);
    }

    if (value.isString()) {
      const n = Number(value.value.trim());
      return Factory.NewNumber(isNaN(n) ? -1 : n);
    }

    if (value.isInstance()) {
      return evaluateObjectSpecialMethod(
        callsite,
        value,
        SpecialName.__angka__,
        (returnValue) =>
          !returnValue.isNumber()
            ? `bukan-angka (tipenya ${returnValue.typeName})`
            : undefined
      );
    }

    return Factory.NewNumber(-1);
  }),
  undefined,
  [required("gue"), optional("nilai", Factory.NewNumber(0))],
];
const angka__teks__: MethodArg = [
  SpecialName.__teks__,
  method.number((self) => Factory.NewString(String(self.value))),
  undefined,
  [required("gue")],
];
const angka__tambah__ = method.op(
  SantaiType.kNumber,
  "angka",
  SpecialName.__tambah__,
  TokenValue.kAdd
);
const angka__kurang__ = method.op(
  SantaiType.kNumber,
  "angka",
  SpecialName.__kurang__,
  TokenValue.kSub
);
const angka__kali__ = method.op(
  SantaiType.kNumber,
  "angka",
  SpecialName.__kali__,
  TokenValue.kMul
);
const angka__bagi__ = method.op(
  SantaiType.kNumber,
  "angka",
  SpecialName.__bagi__,
  TokenValue.kDiv
);
const angka__modulus__ = method.op(
  SantaiType.kNumber,
  "angka",
  SpecialName.__modulus__,
  TokenValue.kMod
);
const angka__pangkat__ = method.op(
  SantaiType.kNumber,
  "angka",
  SpecialName.__pangkat__,
  TokenValue.kExp
);
const angka__sama__ = method.op(
  SantaiType.kNumber,
  "angka",
  SpecialName.__sama__,
  TokenValue.kEq
);
const angka__tidaksama__ = method.op(
  SantaiType.kNumber,
  "angka",
  SpecialName.__tidaksama__,
  TokenValue.kNotEq
);
const angka__kurangdari__ = method.op(
  SantaiType.kNumber,
  "angka",
  SpecialName.__kurangdari__,
  TokenValue.kLessThan
);
const angka__lebihdari__ = method.op(
  SantaiType.kNumber,
  "angka",
  SpecialName.__lebihdari__,
  TokenValue.kGreaterThan
);
const angka__kurangsama__ = method.op(
  SantaiType.kNumber,
  "angka",
  SpecialName.__kurangsama__,
  TokenValue.kLessThanEq
);
const angka__lebihsama__ = method.op(
  SantaiType.kNumber,
  "angka",
  SpecialName.__lebihsama__,
  TokenValue.kGreaterThanEq
);
const angka_sampai: MethodArg = [
  "sampai",
  method.number(({ value: start }, number) => {
    return Factory.NewRange(start, number.isNumber() ? number.value : 0, 1);
  }),
  undefined,
  [required("gue"), required("angka")],
];

function defShiftOp(
  name: string,
  op: (a: number, b: number) => number
): MethodArg {
  return [
    name,
    method.number(({ value: a }, b) => {
      return Factory.NewNumber(op(a, b.isNumber() ? b.value : 0));
    }),
    undefined,
    [required("gue"), required("angka")],
  ];
}

const angka__daftarproperti__: MethodArg = [
  SpecialName.__daftarproperti__,
  ObjectUtil.wrapCallable(() =>
    Factory.NewList(
      numberMethods.map((method) => Factory.NewString(method.name))
    )
  ),
  undefined,
];

const numberMethods: BuiltinFunction[] = [
  Factory.NewBuiltinFunction(...angka__awal__),
  Factory.NewBuiltinFunction(...angka__teks__),
  Factory.NewBuiltinFunction(...angka__tambah__),
  Factory.NewBuiltinFunction(...angka__kurang__),
  Factory.NewBuiltinFunction(...angka__kali__),
  Factory.NewBuiltinFunction(...angka__bagi__),
  Factory.NewBuiltinFunction(...angka__modulus__),
  Factory.NewBuiltinFunction(...angka__pangkat__),
  Factory.NewBuiltinFunction(...angka__sama__),
  Factory.NewBuiltinFunction(...angka__tidaksama__),
  Factory.NewBuiltinFunction(...angka__kurangdari__),
  Factory.NewBuiltinFunction(...angka__lebihdari__),
  Factory.NewBuiltinFunction(...angka__kurangsama__),
  Factory.NewBuiltinFunction(...angka__lebihsama__),
  Factory.NewBuiltinFunction(...angka_sampai),
  Factory.NewBuiltinFunction(...defShiftOp("SHL", (a, b) => a << b)),
  Factory.NewBuiltinFunction(...defShiftOp("SHR", (a, b) => a >> b)),
  Factory.NewBuiltinFunction(...defShiftOp("LSHR", (a, b) => a >>> b)),
  Factory.NewBuiltinFunction(...defShiftOp("AND", (a, b) => a & b)),
  Factory.NewBuiltinFunction(...defShiftOp("OR", (a, b) => a | b)),
  Factory.NewBuiltinFunction(...defShiftOp("XOR", (a, b) => a ^ b)),
  Factory.NewBuiltinFunction(...angka__daftarproperti__),
];

registerPropertyProvider(SantaiType.kNumber, (name, self) => {
  const method = numberMethods.find((n) => n.name === name);
  if (isUndefined(method)) return undefined;
  return method.bindAndCopy(self);
});

defineGlobal("angka", () => {
  return TypeRegistry.registerType(
    Factory.NewBuiltinClass("angka", numberMethods),
    SantaiType.kNumber
  );
});
