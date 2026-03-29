// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { isUndefined } from "../base/types";
import { Factory, SantaiObject, SantaiType } from "../objects/object";
import { defineAndRegisterGlobalClass } from "./builtin";

function intArg(args: SantaiObject[], idx: number): number | undefined {
  const v = args[idx];
  return v?.isNumber() ? Math.trunc(v.value) : undefined;
}

function toRange(args: SantaiObject[]): SantaiObject {
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

defineAndRegisterGlobalClass(
  Factory.NewBuiltinClass("rentang", SantaiType.kRange, toRange)
);
