// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert } from "../base/asserts";
import { TokenValue } from "../parsing/token";
import { Factory, SantaiObject } from "./object";

export interface OperationError {
  readonly op: string;
  readonly left: SantaiObject;
  readonly right?: SantaiObject;
  readonly isDivideByZero?: boolean;
  readonly isModuleByZero?: boolean;
}

export type OperationResult =
  | { ok: true; value: SantaiObject }
  | { ok: false; value: OperationError };

const ok = (value: SantaiObject): OperationResult => ({ ok: true, value });
const err = (value: OperationError): OperationResult => ({ ok: false, value });

export const Operation = {
  // Arithmetic
  Add: (left: SantaiObject, right: SantaiObject): OperationResult => {
    if (left.isNumber() && right.isNumber()) {
      return ok(Factory.NewNumber(left.value + right.value));
    }

    if (left.isString()) {
      if (right.isString()) {
        return ok(Factory.NewString(left.value + right.value));
      }
      if (right.isNumber() || right.isBoolean()) {
        return ok(Factory.NewString(left.value + right.value));
      }
    }

    if (left.isList() && right.isList()) {
      return ok(Factory.NewList([...left.elements, ...right.elements]));
    }

    return err({ op: "+", left, right });
  },
  Sub: (left: SantaiObject, right: SantaiObject): OperationResult => {
    if (left.isNumber() && right.isNumber()) {
      return ok(Factory.NewNumber(left.value - right.value));
    }

    return err({ op: "-", left, right });
  },
  Mul: (left: SantaiObject, right: SantaiObject): OperationResult => {
    if (left.isNumber() && right.isNumber()) {
      return ok(Factory.NewNumber(left.value * right.value));
    }

    return err({ op: "*", left, right });
  },
  Div: (left: SantaiObject, right: SantaiObject): OperationResult => {
    if (!left.isNumber() || !right.isNumber()) {
      return err({ op: "/", left, right });
    }

    if (right.value === 0) {
      return err({ op: "/", left, right, isDivideByZero: true });
    }

    return ok(Factory.NewNumber(left.value / right.value));
  },
  Mod: (left: SantaiObject, right: SantaiObject): OperationResult => {
    if (!left.isNumber() || !right.isNumber()) {
      return err({ op: "%", left, right });
    }

    if (right.value === 0) {
      return err({ op: "%", left, right, isModuleByZero: true });
    }

    return ok(Factory.NewNumber(left.value % right.value));
  },
  Exp: (left: SantaiObject, right: SantaiObject): OperationResult => {
    if (left.isNumber() && right.isNumber()) {
      return ok(Factory.NewNumber(left.value ** right.value));
    }

    return err({ op: "**", left, right });
  },

  // Comparison
  Eq: (left: SantaiObject, right: SantaiObject): OperationResult => {
    if (left.isKosong()) return ok(Factory.Boolean(right.isKosong()));

    if (left.isBoolean()) {
      if (!right.isBoolean()) return ok(Factory.False);
      return ok(Factory.Boolean(left.value === right.value));
    }

    if (left.isNumber()) {
      if (!right.isNumber()) return ok(Factory.False);
      return ok(Factory.Boolean(left.value === right.value));
    }

    if (left.isString()) {
      if (!right.isString()) return ok(Factory.False);
      return ok(Factory.Boolean(left.value === right.value));
    }

    if (left.isRange() && right.isRange()) {
      return ok(
        Factory.Boolean(
          left.start === right.start &&
            left.stop === right.stop &&
            left.step === right.step
        )
      );
    }

    return ok(Factory.Boolean(left === right));
  },
  Ne: (left: SantaiObject, right: SantaiObject): OperationResult => {
    const eq = Operation.Eq(left, right);
    if (!eq.ok) return eq;
    assert(eq.value.isBoolean());
    return ok(Factory.Boolean(!eq.value.value));
  },
  Lt: (left: SantaiObject, right: SantaiObject): OperationResult => {
    if (left.isNumber() && right.isNumber()) {
      return ok(Factory.Boolean(left.value < right.value));
    }

    if (left.isString() && right.isString()) {
      return ok(Factory.Boolean(left.value < right.value));
    }

    return err({ op: "<", left, right });
  },
  Gt: (left: SantaiObject, right: SantaiObject): OperationResult => {
    if (left.isNumber() && right.isNumber()) {
      return ok(Factory.Boolean(left.value > right.value));
    }
    if (left.isString() && right.isString()) {
      return ok(Factory.Boolean(left.value > right.value));
    }
    return err({ op: ">", left, right });
  },
  Lte: (left: SantaiObject, right: SantaiObject): OperationResult => {
    // a <= b  =  !(a > b)
    const gt = Operation.Gt(left, right);
    if (!gt.ok) return gt;
    assert(gt.value.isBoolean());
    return ok(Factory.Boolean(!gt.value.value));
  },
  Gte: (left: SantaiObject, right: SantaiObject): OperationResult => {
    // a >= b  =  !(a < b)
    const lt = Operation.Lt(left, right);
    if (!lt.ok) return lt;
    assert(lt.value.isBoolean());
    return ok(Factory.Boolean(!lt.value.value));
  },
};

export type Operation = (typeof Operation)[keyof typeof Operation];

export const TokenToOperation: Readonly<Record<number, Operation>> = {
  [TokenValue.kAdd]: Operation.Add,
  [TokenValue.kSub]: Operation.Sub,
  [TokenValue.kMul]: Operation.Mul,
  [TokenValue.kDiv]: Operation.Div,
  [TokenValue.kMod]: Operation.Mod,
  [TokenValue.kExp]: Operation.Exp,
  [TokenValue.kEq]: Operation.Eq,
  [TokenValue.kNotEq]: Operation.Ne,
  [TokenValue.kLessThan]: Operation.Lt,
  [TokenValue.kGreaterThan]: Operation.Gt,
  [TokenValue.kLessThanEq]: Operation.Lte,
  [TokenValue.kGreaterThanEq]: Operation.Gte,
};
