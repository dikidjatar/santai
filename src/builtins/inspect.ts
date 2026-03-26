import { assert } from "../base/asserts";
import {
  SantaiKosong,
  SantaiNumber,
  SantaiObject,
  SantaiString,
} from "../objects/object";
import { defineGlobalFunction } from "./builtin";

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
  const obj: SantaiObject = args[0] ?? SantaiKosong.INSTANCE;

  if (obj.isString()) {
    return new SantaiNumber([...obj.value].length);
  } else if (obj.isList()) {
    return new SantaiNumber(obj.length);
  }

  return new SantaiNumber(0);
});

defineGlobalFunction("tipe", (self, args) => {
  assert(!self);
  const obj: SantaiObject = args[0] ?? SantaiKosong.INSTANCE;
  return new SantaiString(obj.typeName);
});
