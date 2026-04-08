// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert, assertDefined } from "../base/asserts";
import {
  CallSite,
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
  fn: (
    self: SantaiList,
    args: SantaiObject[],
    callsite: CallSite
  ) => SantaiObject,
  params?: readonly GlobalMethodParam[]
) {
  methods.define(
    name,
    (self, args, callsite) => {
      assertDefined(self);
      assert(self.isList());

      return fn(self, args, callsite);
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

define(
  "cariin",
  (self, args, callsite) => {
    const fn = args[0];
    if (!Factory.IsCallable(fn)) return Factory.Kosong;
    const elememts: readonly SantaiObject[] = self.elements;
    const result = elememts.find((element) => {
      return callsite.invoke(fn, [element]).isTruthy();
    });
    return result ? result : Factory.Kosong;
  },
  [required("aksi_cari")]
);

methods.registerFor(SantaiType.kList);
