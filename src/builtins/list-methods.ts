// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert, assertDefined } from "../base/asserts";
import { Factory, SantaiObject } from "../objects/object";
import { SantaiType } from "../objects/st-type";
import { arg0 } from "./builtin";
import { MethodTable } from "./methods";

const listMethods = new MethodTable();

function define(
  name: string,
  fn: (value: SantaiObject[], args: SantaiObject[]) => SantaiObject
) {
  listMethods.define(name, (self, args) => {
    assertDefined(self);
    assert(self.isList());

    return fn(self.elements, args);
  });
}

define("tambah", (elements, args) => {
  for (const arg of args) elements.push(arg);
  return Factory.NewNumber(elements.length);
});

define("hapus", (elements, args) => {
  const arg = arg0(args);
  if (arg.isNumber()) {
    const index = arg.value;
    if (index >= 0 && index < elements.length) {
      elements.splice(index, 1);
    }
  }
  return Factory.Kosong;
});

listMethods.registerFor(SantaiType.kList);
