// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert, assertDefined } from "../base/asserts";
import {
  Factory,
  GlobalMethodParam,
  SantaiObject,
  SantaiRange,
} from "../objects/object";
import { SantaiType } from "../objects/st-type";
import { MethodTable } from "./methods";
import { required } from "./paramSpec";

const method = new MethodTable();

function define(
  name: string,
  fn: (value: SantaiRange, args: SantaiObject[]) => SantaiObject,
  params?: readonly GlobalMethodParam[]
) {
  method.define(
    name,
    (self, args) => {
      assertDefined(self);
      assert(self.isRange());

      return fn(self, args);
    },
    params
  );
}

define(
  "loncat",
  (value, args) => {
    const step: number = args[0].isNumber() ? args[0].value : value.step;
    return Factory.NewRange(value.start, value.stop, step);
  },
  [required("angka")]
);

method.registerFor(SantaiType.kRange);
