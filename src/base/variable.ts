// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

export const enum VariableMode {
  kVar,
  kConst,
  kFunction,
}

export function variableModeString(mode: VariableMode): string {
  switch (mode) {
    case VariableMode.kVar:
      return "VAR";
    case VariableMode.kConst:
      return "CONST";
    case VariableMode.kFunction:
      return "FUNCTION";
  }
}

export class Variable {
  constructor(
    readonly name: string,
    readonly mode: VariableMode
  ) {}

  isConst(): boolean {
    return this.mode === VariableMode.kConst;
  }

  isFunction(): boolean {
    return this.mode === VariableMode.kFunction;
  }
}
