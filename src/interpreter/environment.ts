// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { Variable } from "../ast/variable";
import { assertDefined } from "../base/asserts";
import { SantaiObject } from "../objects/object";

export interface VariableSlot {
  readonly variable: Variable;
  value: SantaiObject;
}

function createVariableSlot(
  variable: Variable,
  value: SantaiObject
): VariableSlot {
  return { variable, value };
}

export class Environment {
  public static new(enclosing?: Environment): Environment {
    return new Environment(enclosing);
  }

  private _store: Map<string, VariableSlot> = new Map();

  constructor(readonly enclosing?: Environment) {}

  get(name: string): SantaiObject | undefined;
  get(variable: Variable): SantaiObject | undefined;
  get(variableOrName: Variable | string): SantaiObject | undefined {
    let name: string;

    if (typeof variableOrName === "string") {
      name = variableOrName;
    } else {
      name = variableOrName.name;
    }

    const variableSlot = this.findSlot(name);
    return variableSlot ? variableSlot.value : undefined;
  }

  declare(variable: Variable, value: SantaiObject): boolean {
    const variableName = variable.name;

    if (this._store.has(variableName)) {
      return false;
    }

    this._store.set(variableName, createVariableSlot(variable, value));
    return true;
  }

  update(name: string, value: SantaiObject): boolean;
  update(variable: Variable, value: SantaiObject): boolean;
  update(nameOrVariable: string | Variable, value: SantaiObject): boolean {
    const name =
      typeof nameOrVariable === "string" ? nameOrVariable : nameOrVariable.name;
    const owner = this.findOwnerEnvironment(name);

    if (owner) {
      const slot = owner._store.get(name);
      assertDefined(slot);

      if (slot.variable && slot.variable.isConst()) {
        return false;
      }

      slot.value = value;
      return true;
    }

    return false;
  }

  findSlot(name: string): VariableSlot | undefined {
    let current: Environment | undefined = this;

    while (current !== undefined) {
      const variableSlot = current._store.get(name);

      if (variableSlot) {
        return variableSlot;
      }

      current = current.enclosing;
    }

    return undefined;
  }

  private findOwnerEnvironment(name: string): Environment | undefined {
    let current: Environment | undefined = this;

    while (current !== undefined) {
      if (current._store.has(name)) {
        return current;
      }

      current = current.enclosing;
    }

    return undefined;
  }
}
