// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { Factory, SantaiObject } from "../objects/object";
import { arg, defineGlobalFunction } from "./builtin";

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
    const keep = callsite.infoke(fn, [item]);
    if (keep.isTruthy()) {
      result.push(item);
    }
    next = iter.next();
  }

  return Factory.NewList(result);
});
