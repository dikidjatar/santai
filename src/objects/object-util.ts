// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert, assertDefined, assertNever } from "../base/asserts";
import { MessageTemplate } from "../base/messageTemplate";
import { Token, TokenValue } from "../parsing/token";
import { Callable, CallSite, SantaiObject } from "./object";
import { Operation, TokenToOperation } from "./operations";
import { SantaiType } from "./st-type";

export interface WrapMethodOptions<T extends SantaiObject> {
  fn: (callsite: CallSite, self: T, ...args: SantaiObject[]) => SantaiObject;
  assertDescriptor: (
    callsite: CallSite,
    self: SantaiObject
  ) => asserts self is T;
}

export namespace ObjectUtil {
  export function Equals(left: SantaiObject, right: SantaiObject): boolean {
    const result = Operation.Eq(left, right);
    if (!result.ok) {
      return false;
    }
    assert(result.value.isBoolean());
    return result.value.value;
  }

  export function checkObjectDescriptor<T extends SantaiObject>(
    callsite: CallSite,
    self: SantaiObject,
    type: SantaiType,
    typename: string
  ): asserts self is T {
    if (self.type !== type) {
      assertNever(
        callsite.throw(
          MessageTemplate.kInvaidObjectDescriptor,
          typename,
          self.typeName
        )
      );
    }
  }

  export function wrapCallable(
    fn: (callsite: CallSite, ...args: SantaiObject[]) => SantaiObject
  ): Callable {
    return (_self, args, callsite) => {
      return fn(callsite, ...args);
    };
  }

  export function wrapMethod<T extends SantaiObject>(
    options: WrapMethodOptions<T>
  ): Callable {
    return wrapCallable((callsite, self, ...args) => {
      options.assertDescriptor(callsite, self);
      return options.fn(callsite, self, ...args);
    });
  }

  export function wrapMethodOp<T extends SantaiObject>(
    op: TokenValue,
    assertDescriptor: WrapMethodOptions<T>["assertDescriptor"]
  ): Callable {
    return ObjectUtil.wrapMethod<T>({
      fn: (callsite, left, right) => {
        const result = TokenToOperation[op]?.(left, right);
        assertDefined(result);
        if (result.ok) return result.value;
        assertNever(
          callsite.throw(
            MessageTemplate.kUnsupportedBinaryOperation,
            Token.string(op),
            left.typeName,
            right.typeName
          )
        );
      },
      assertDescriptor,
    });
  }
}
