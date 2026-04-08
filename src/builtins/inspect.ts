// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert } from "../base/asserts";
import { isUndefined } from "../base/types";
import { Factory, SantaiObject } from "../objects/object";
import { SantaiType } from "../objects/st-type";
import { TypeRegistry } from "../objects/typeRegistry";
import {
  arg0,
  defineAndRegisterGlobalClass,
  defineGlobalFunction,
} from "./builtin";
import { optional, required } from "./paramSpec";

/**
 * `panjang(value)` — the number of elements or characters of a value.
 *
 * Uses spread `[...str]` for Text to count as emojis
 * 1 character instead of 2 UTF-16 code-units.
 *
 * @example
 * panjang("halo")      # 4
 * panjang("😀🎉")      # 2 (not 4)
 * panjang([1, 2, 3])   # 3
 */
defineGlobalFunction(
  "panjang",
  (self, args) => {
    assert(!self);
    return Factory.NewNumber(args[0].getLength());
  },
  [required("nilai")]
);

defineAndRegisterGlobalClass(
  Factory.NewBuiltinClass(
    "tipe",
    SantaiType.kBuiltinClass,
    (args) => {
      const obj: SantaiObject = arg0(args);

      if (obj.isInstance()) {
        return obj.getClass();
      }

      const cls = TypeRegistry.getTypeOf(obj);
      if (!isUndefined(cls)) {
        return cls;
      }

      return Factory.NewBuiltinClass(
        obj.typeName,
        SantaiType.kBuiltinClass,
        () => Factory.Kosong
      );
    },
    [required("objek")]
  )
);

function toNumber(args: SantaiObject[]): SantaiObject {
  const obj = arg0(args);

  if (obj.isNumber()) {
    return obj;
  }

  if (obj.isBoolean()) {
    return Factory.NewNumber(obj.value ? 1 : 0);
  }

  if (obj.isString()) {
    const n = Number(obj.value.trim());
    return Factory.NewNumber(isNaN(n) ? 0 : n);
  }

  return Factory.NewNumber(0);
}

function toText(args: SantaiObject[]): SantaiObject {
  const val = arg0(args);

  if (val.isString()) {
    return val;
  }

  return Factory.NewString(val.inspect());
}

function toBoolean(args: SantaiObject[]): SantaiObject {
  return Factory.Boolean(arg0(args).isTruthy());
}

function toList(args: SantaiObject[]): SantaiObject {
  const val = args[0] ?? Factory.Kosong;

  if (val.isList()) {
    return val;
  }

  if (val.isIterable()) {
    const iterator = val.iterate();
    const elements: SantaiObject[] = [];

    let result = iterator.next();

    while (!result.done) {
      elements.push(result.value);
      result = iterator.next();
    }

    return Factory.NewList(elements);
  }

  return Factory.NewList([val]);
}

defineAndRegisterGlobalClass(
  Factory.NewBuiltinClass("angka", SantaiType.kNumber, toNumber)
);

defineAndRegisterGlobalClass(
  Factory.NewBuiltinClass("teks", SantaiType.kString, toText)
);

defineAndRegisterGlobalClass(
  Factory.NewBuiltinClass("logika", SantaiType.kBoolen, toBoolean)
);

defineAndRegisterGlobalClass(
  Factory.NewBuiltinClass("daftar", SantaiType.kList, toList)
);

defineGlobalFunction(
  "daftar_metode",
  (self, args) => {
    assert(!self);
    const names = args[0].dir();
    return Factory.NewList(names.map((name) => Factory.NewString(name)));
  },
  [optional("objek", Factory.Kosong)]
);
