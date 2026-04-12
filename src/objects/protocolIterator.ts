// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { MessageTemplate } from "../base/messageTemplate";
import { isUndefined } from "../base/types";
import { isBreakSignal } from "../interpreter/flows";
import { CallSite, SantaiIterator, SantaiObject } from "./object";
import { SpecialName } from "./specialNames";

/**
 * Wraps a Santai iterator object (the value returned by __iterasi__) and
 * drives it by repeatedly calling __lanjut__.
 * The BreakSignal thrown from __lanjut__ signals exhaustion.
 * Any other signal is re-thrown so it propagates naturally up the call stack.
 */
export class ProtocolIterator extends SantaiIterator {
  private readonly nextMethod: SantaiObject;
  private _hasNext = true;

  constructor(
    private readonly callsite: CallSite,
    iteratorObj: SantaiObject
  ) {
    super();
    const nextMethod = iteratorObj.getProperty(SpecialName.__lanjut__);
    if (isUndefined(nextMethod)) {
      // iteratorObj does not implement __lanjut__. It is not a valid iterator.
      callsite.throw(MessageTemplate.kNotIterable, iteratorObj.typeName);
    }

    this.nextMethod = nextMethod;
  }

  override hasNext(): boolean {
    return this._hasNext;
  }

  override next(): IteratorResult<SantaiObject, any> {
    try {
      const value = this.callsite.invoke(this.nextMethod, []);
      return { value, done: false };
    } catch (signal) {
      this._hasNext = false;

      // BreakSignal == StopIteration: iterator is exhausted, stop cleanly.
      if (isBreakSignal(signal)) {
        return { value: undefined as never, done: true };
      }

      // Any other signal must
      // propagate upward. Do not swallow it.
      throw signal;
    }
  }
}

export function createIterator(
  callsite: CallSite,
  iterable: SantaiObject
): SantaiIterator {
  // __iterasi__ protocol (user instances and opted-in builtins)
  const iterMethod = iterable.getProperty(SpecialName.__iterasi__);
  if (!isUndefined(iterMethod)) {
    const iteratorObj = callsite.invoke(iterMethod, []);
    return new ProtocolIterator(callsite, iteratorObj);
  }

  if (iterable.isIterable()) {
    return iterable.iterate();
  }

  callsite.throw(MessageTemplate.kNotIterable, iterable.typeName);
}
