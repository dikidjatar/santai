// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert } from "../base/asserts";
import { MessageTemplate } from "../base/messageTemplate";
import { isUndefined } from "../base/types";
import { isBreakSignal } from "../interpreter/flows";
import {
  CallSite,
  SantaiInstanceIterator,
  SantaiIterator,
  SantaiObject,
} from "./object";
import { SpecialName } from "./specialNames";

export class InstanceIteratorResult extends SantaiIterator {
  private readonly nextMethod: SantaiObject;
  private _hasNext: boolean = true;

  constructor(
    private readonly callsite: CallSite,
    instanceIterator: SantaiInstanceIterator
  ) {
    super();
    const iteratorObj: SantaiObject = instanceIterator.next().value;
    assert(iteratorObj.isFunction());
    const returnValue = callsite.invoke(iteratorObj, []);
    const nextMethod = returnValue.getProperty(SpecialName.__lanjut__);
    if (isUndefined(nextMethod)) {
      callsite.throw(MessageTemplate.kNotIterable, returnValue.typeName);
    }
    this.nextMethod = nextMethod;
  }

  override hasNext(): boolean {
    return this._hasNext;
  }

  override next(): IteratorResult<SantaiObject> {
    try {
      return { value: this.callsite.invoke(this.nextMethod, []), done: false };
    } catch (signal) {
      this._hasNext = false;
      if (isBreakSignal(signal)) {
        return { value: undefined, done: true };
      }
      throw signal;
    }
  }
}
