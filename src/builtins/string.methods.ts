// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert, assertDefined } from "../base/asserts";
import { Factory, SantaiObject } from "../objects/object";
import { SantaiType } from "../objects/st-type";
import { arg0 } from "./builtin";
import { MethodTable } from "./methods";

const stringMethod = new MethodTable();

function define(
  name: string,
  fn: (value: string, args: SantaiObject[]) => SantaiObject
) {
  stringMethod.define(name, (self, args) => {
    assertDefined(self);
    assert(self.isString());

    return fn(self.value, args);
  });
}

define("kapital", (value, args) => {
  const arg = arg0(args);
  const allWord = arg.isBoolean() && arg.isTruthy();

  const result = allWord
    ? value.replace(/\S+/g, (w) => w[0]!.toUpperCase() + w.slice(1))
    : value.replace(/\S/, (c) => c.toUpperCase());

  return Factory.NewString(result);
});

define("besar", (value) => Factory.NewString(value.toUpperCase()));
define("kecil", (value) => Factory.NewString(value.toLowerCase()));
define("rapikan", (value) => Factory.NewString(value.trim()));

stringMethod.registerFor(SantaiType.kString);
