// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  BreakStatement,
  ContinueStatement,
  ReturnStatement,
  ThrowStatement,
} from "../ast/ast";
import { Signal } from "../base/types";
import { SantaiError, SantaiObject } from "../objects/object";

export class ReturnSignal extends Signal<ReturnStatement> {
  constructor(
    node: ReturnStatement,
    readonly value: SantaiObject
  ) {
    super(node);
  }
}

export class BreakSignal extends Signal<BreakStatement> {}
export class ContinueSignal extends Signal<ContinueStatement> {}
export class ThrowSignal extends Signal<ThrowStatement> {
  constructor(
    node: ThrowStatement,
    readonly value: SantaiObject
  ) {
    super(node);
  }
}

export class RuntimeErrorSignal extends Signal<void> {
  constructor(readonly error: SantaiError) {
    super();
  }
}

export function isReturnSignal(signal: unknown): signal is ReturnSignal {
  return signal instanceof ReturnSignal;
}

export function isBreakSignal(signal: unknown): signal is BreakSignal {
  return signal instanceof BreakSignal;
}

export function isContinueSignal(signal: unknown): signal is ContinueSignal {
  return signal instanceof ContinueSignal;
}

export function isThrowSignal(signal: unknown): signal is ThrowSignal {
  return signal instanceof ThrowSignal;
}

export function isRuntimeErrorSignal(
  signal: unknown
): signal is RuntimeErrorSignal {
  return signal instanceof RuntimeErrorSignal;
}
