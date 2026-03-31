// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert, assertDefined } from "../base/asserts";
import { Factory, SantaiObject } from "../objects/object";
import { SantaiType } from "../objects/st-type";
import { arg0 } from "./builtin";
import { MethodTable } from "./methods";
import { BuiltinParam, required } from "./paramSpec";

const listMethods = new MethodTable();

function define(
  name: string,
  fn: (value: SantaiObject[], args: SantaiObject[]) => SantaiObject,
  params?: readonly BuiltinParam[]
) {
  listMethods.define(
    name,
    (self, args) => {
      assertDefined(self);
      assert(self.isList());

      return fn(self.elements, args);
    },
    params
  );
}

define(
  "tambah",
  (elements, args) => {
    for (const arg of args) elements.push(arg);
    return Factory.NewNumber(elements.length);
  },
  [required("data")]
);

define(
  "hapus",
  (elements, args) => {
    const arg = arg0(args);
    if (arg.isNumber()) {
      const index = arg.value;
      if (index >= 0 && index < elements.length) {
        elements.splice(index, 1);
      }
    }
    return Factory.Kosong;
  },
  [required("indeks")]
);

define(
  "kosongin",
  (elements) => {
    elements.splice(0, elements.length);
    return Factory.Kosong;
  },
  []
);

listMethods.registerFor(SantaiType.kList);
