// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert } from "../base/asserts";
import { isUndefined } from "../base/types";
import {
  SantaiBoolean,
  SantaiBuiltinClass,
  santaiKosong,
  SantaiList,
  SantaiNumber,
  SantaiObject,
  SantaiString,
  SantaiType,
} from "../objects/object";
import { getBuiltinClassOf } from "../objects/typeRegistry";
import {
  arg0,
  defineAndRegisterGlobalClass,
  defineGlobalFunction,
} from "./builtin";

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
defineGlobalFunction("panjang", (self, args) => {
  assert(!self);
  const obj: SantaiObject = args[0] ?? santaiKosong;

  if (obj.isString()) {
    return new SantaiNumber([...obj.value].length);
  } else if (obj.isList()) {
    return new SantaiNumber(obj.length);
  }

  return new SantaiNumber(0);
});

defineAndRegisterGlobalClass(
  new SantaiBuiltinClass("tipe", SantaiType.kBuiltinClass, (args) => {
    const obj: SantaiObject = arg0(args);

    if (obj.isInstance()) {
      return obj.getClass();
    }

    const cls = getBuiltinClassOf(obj);
    if (!isUndefined(cls)) {
      return cls;
    }

    return new SantaiBuiltinClass(
      "tipe",
      SantaiType.kBuiltinClass,
      () => santaiKosong
    );
  })
);

function toNumber(args: SantaiObject[]): SantaiObject {
  const obj = arg0(args);

  if (obj.isNumber()) {
    return obj;
  }

  if (obj.isBoolean()) {
    return new SantaiNumber(obj.value ? 1 : 0);
  }

  if (obj.isString()) {
    const n = Number(obj.value.trim());
    return new SantaiNumber(isNaN(n) ? 0 : n);
  }

  return new SantaiNumber(0);
}

function toText(args: SantaiObject[]): SantaiObject {
  const val = arg0(args);

  if (val.isString()) {
    return val;
  }

  return new SantaiString(val.inspect());
}

function toBoolean(args: SantaiObject[]): SantaiObject {
  return SantaiBoolean.of(arg0(args).isTruthy());
}

function toList(args: SantaiObject[]): SantaiObject {
  const val = args[0] ?? santaiKosong;

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

    return new SantaiList(elements);
  }

  return new SantaiList([val]);
}

defineAndRegisterGlobalClass(
  new SantaiBuiltinClass("angka", SantaiType.kNumber, toNumber)
);

defineAndRegisterGlobalClass(
  new SantaiBuiltinClass("teks", SantaiType.kString, toText)
);

defineAndRegisterGlobalClass(
  new SantaiBuiltinClass("logika", SantaiType.kBoolen, toBoolean)
);

defineAndRegisterGlobalClass(
  new SantaiBuiltinClass("daftar", SantaiType.kList, toList)
);
