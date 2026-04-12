// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert } from "../base/asserts";
import { Factory, SantaiObject } from "../objects/object";
import { SpecialName } from "../objects/specialNames";
import { arg, defineGlobalFunction } from "./builtin";
import { required } from "./paramSpec";

defineGlobalFunction(
  "panjang",
  (self, args) => {
    assert(!self);
    return Factory.NewNumber(args[0].getLength());
  },
  [required("nilai")]
);

defineGlobalFunction("saring", (_, args, callsite) => {
  const iterable = arg(args, 0);
  const fn = arg(args, 1);

  if (!iterable.isIterable() || !Factory.IsCallable(fn)) {
    return Factory.NewList([]);
  }

  const result: SantaiObject[] = [];
  const iter = iterable.iterate();

  let next = iter.next();
  while (!next.done) {
    const item = next.value;
    const keep = callsite.invoke(fn, [item]);
    if (keep.isTruthy()) {
      result.push(item);
    }
    next = iter.next();
  }

  return Factory.NewList(result);
});

defineGlobalFunction("olah", (_, args, callsite) => {
  const iterable = arg(args, 0);
  const fn = arg(args, 1);

  if (!iterable.isIterable() || !Factory.IsCallable(fn)) {
    return Factory.NewList([]);
  }

  const result: SantaiObject[] = [];
  const iter = iterable.iterate();

  let next = iter.next();
  while (!next.done) {
    result.push(callsite.invoke(fn, [next.value]));
    next = iter.next();
  }

  return Factory.NewList(result);
});

defineGlobalFunction(
  "daftar_properti",
  (self, args, callsite) => {
    assert(!self);
    const propertyMethod = args[0].getProperty(SpecialName.__daftarproperti__);
    if (propertyMethod) {
      const result = callsite.invoke(propertyMethod, []);
      return result;
    }
    return Factory.NewList([]);
  },
  [required("objek")]
);
