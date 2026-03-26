import { assert } from "../base/asserts";
import { isUndefined } from "../base/types";
import { SantaiKosong, SantaiObject, SantaiRange } from "../objects/object";
import { defineGlobalFunction } from "./builtin";

function intArg(args: SantaiObject[], idx: number): number | undefined {
  const v = args[idx];
  return v?.isNumber() ? Math.trunc(v.value) : undefined;
}

defineGlobalFunction("rentang", (self, args) => {
  assert(!self);

  let start: number;
  let stop: number;
  let step: number;

  const a0 = intArg(args, 0);
  const a1 = intArg(args, 1);
  const a2 = intArg(args, 2);

  if (isUndefined(a0)) {
    return new SantaiRange(0, 0, 1);
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
    return SantaiKosong.INSTANCE;
  }

  return new SantaiRange(start, stop, step);
});
