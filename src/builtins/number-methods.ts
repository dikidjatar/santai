// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert, assertDefined } from "../base/asserts";
import { Factory, SantaiObject } from "../objects/object";
import { SantaiType } from "../objects/st-type";
import { MethodTable } from "./methods";
import { BuiltinParam, required } from "./paramSpec";

const numberMethod = new MethodTable();

function define(
  name: string,
  fn: (value: number, args: SantaiObject[]) => SantaiObject,
  params?: readonly BuiltinParam[]
) {
  numberMethod.define(
    name,
    (self, args) => {
      assertDefined(self);
      assert(self.isNumber());

      return fn(self.value, args);
    },
    params
  );
}

function defShiftOp(name: string, op: (a: number, b: number) => number) {
  define(
    name,
    (value, args) => {
      return Factory.NewNumber(
        op(value, args[0].isNumber() ? args[0].value : 0)
      );
    },
    [required("angka")]
  );
}

define(
  "sampai",
  (start, args) => {
    return Factory.NewRange(start, args[0].isNumber() ? args[0].value : 0, 1);
  },
  [required("angka")]
);
defShiftOp("SHL", (a, b) => a << b);
defShiftOp("SHR", (a, b) => a >> b);
defShiftOp("LSHR", (a, b) => a >>> b);
defShiftOp("AND", (a, b) => a & b);
defShiftOp("OR", (a, b) => a | b);
defShiftOp("XOR", (a, b) => a ^ b);

numberMethod.registerFor(SantaiType.kNumber);
