// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert, assertDefined } from "../base/asserts";
import {
  Factory,
  GlobalMethodParam,
  SantaiList,
  SantaiObject,
} from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { SantaiType } from "../objects/st-type";
import { MethodTable } from "./methods";
import { required } from "./paramSpec";

const methods = new MethodTable();

function define(
  name: string,
  fn: (self: SantaiList, args: SantaiObject[]) => SantaiObject,
  params?: readonly GlobalMethodParam[]
) {
  methods.define(
    name,
    (self, args) => {
      assertDefined(self);
      assert(self.isList());

      return fn(self, args);
    },
    params
  );
}

define("tambah", (self, args) => Factory.NewNumber(self.push(...args)), [
  required("data"),
]);

define(
  "hapus",
  (self, args) => {
    const target = args[0];
    const index = self.elements.findIndex((e) => ObjectUtil.Equals(e, target));
    self.remove(index);
    return Factory.Kosong;
  },
  [required("item")]
);

define(
  "hapus_ke",
  (self, args) => {
    const index = args[0].isNumber() ? args[0].value : -1;
    return self.remove(index);
  },
  [required("posisi")]
);

define(
  "kosongin",
  (self) => {
    self.clear();
    return Factory.Kosong;
  },
  []
);

define(
  "berisi",
  (self, args) => {
    return Factory.Boolean(
      self.elements.some((e) => ObjectUtil.Equals(e, args[0]))
    );
  },
  [required("item")]
);

define(
  "posisi",
  (self, args) => {
    return Factory.NewNumber(
      self.elements.findIndex((e) => ObjectUtil.Equals(e, args[0]))
    );
  },
  [required("item")]
);

define("balik", (self) => self.reverse(), []);

define(
  "unik",
  (self) => {
    const seen = new Set<string>();
    const result: SantaiObject[] = [];
    for (const el of self.elements) {
      const key = el.inspect();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(el);
      }
    }
    return Factory.NewList(result);
  },
  []
);

methods.registerFor(SantaiType.kList);
