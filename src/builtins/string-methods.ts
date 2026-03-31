// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert, assertDefined } from "../base/asserts";
import { Factory, SantaiObject } from "../objects/object";
import { SantaiType } from "../objects/st-type";
import { arg0 } from "./builtin";
import { MethodTable } from "./methods";
import { BuiltinParam, optional, required } from "./paramSpec";

const stringMethod = new MethodTable();

function define(
  name: string,
  fn: (value: string, args: SantaiObject[]) => SantaiObject,
  params?: readonly BuiltinParam[]
) {
  stringMethod.define(
    name,
    (self, args) => {
      assertDefined(self);
      assert(self.isString());

      return fn(self.value, args);
    },
    params
  );
}

define(
  "kapital",
  (value, args) => {
    const arg = arg0(args);
    const allWord = arg.isBoolean() && arg.isTruthy();

    const result = allWord
      ? value.replace(/\S+/g, (w) => w[0]!.toUpperCase() + w.slice(1))
      : value.replace(/\S/, (c) => c.toUpperCase());

    return Factory.NewString(result);
  },
  [optional("semua", Factory.Boolean(false))]
);

define("gedein", (value) => Factory.NewString(value.toUpperCase()), []);
define("kecilin", (value) => Factory.NewString(value.toLowerCase()), []);
define("rapiin", (value) => Factory.NewString(value.trim()), []);
define(
  "diawali",
  (value, args) => {
    const searchString = arg0(args);
    if (!searchString.isNumber() && !searchString.isString()) {
      return Factory.Boolean(false);
    }
    return Factory.Boolean(value.startsWith(searchString.value as string));
  },
  [required("teks")]
);
define(
  "diakhiri",
  (value, args) => {
    const searchString = arg0(args);
    if (!searchString.isNumber() && !searchString.isString()) {
      return Factory.Boolean(false);
    }
    return Factory.Boolean(value.endsWith(searchString.value as string));
  },
  [required("teks")]
);
define(
  "karakter_ke",
  (value, args) => {
    const position = arg0(args);
    if (!position.isNumber()) {
      return Factory.NewString(value.charAt(0));
    }

    return Factory.NewString(value.charAt(position.value));
  },
  [required("indeks")]
);
define(
  "ganti",
  (value, args) => {
    const searchValue = args[0];
    const replaceValue = args[1];
    const newValue = value.replace(
      searchValue.inspect(),
      replaceValue.inspect()
    );
    return Factory.NewString(newValue);
  },
  [required("teks"), required("ganti")]
);
define(
  "pisahin",
  (value, args) => {
    const limit = args[1].isNumber() ? args[1].value : undefined;
    const elements = value.split(args[0].inspect(), limit);
    return Factory.NewList(elements.map((e) => Factory.NewString(e)));
  },
  [required("pemisah"), optional("batas", Factory.NewNumber(-1))]
);
define(
  "berisi",
  (value, args) => {
    const searchString = args[0];
    const position = args[1].isNumber() ? args[1].value : undefined;
    return Factory.Boolean(value.includes(searchString.inspect(), position));
  },
  [required("teks"), optional("posisi", Factory.Kosong)]
);

stringMethod.registerFor(SantaiType.kString);
