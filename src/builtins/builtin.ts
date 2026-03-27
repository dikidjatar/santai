// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert } from "../base/asserts";
import {
  BuiltinFunction,
  SantaiBuiltinClass,
  santaiKosong,
  SantaiObject,
} from "../objects/object";
import { register } from "../objects/typeRegistry";

export type BuiltinCallable = (
  self: SantaiObject | undefined,
  args: SantaiObject[]
) => SantaiObject;

export interface BuiltinDefinition {
  readonly name: string;
  readonly callable: BuiltinCallable;
}

export function arg(args: SantaiObject[], index: number): SantaiObject {
  return args[index] ?? santaiKosong;
}

export function arg0(args: SantaiObject[]): SantaiObject {
  return arg(args, 0);
}

/**
 * Registry for managing built-in functions in the Santai language.
 *
 * This class implements the Singleton pattern to ensure only one instance
 * of the registry exists throughout the application lifetime. It maintains
 * a collection of built-in functions dan variables that can be registered and retrieved.
 */
export class BuiltinRegistry {
  private static _instance: BuiltinRegistry | undefined = undefined;
  private readonly globals: Map<string, BuiltinFunction | SantaiBuiltinClass> =
    new Map();

  /**
   * The singleton instance of the BuiltinRegistry.
   */
  public static getInstance(): BuiltinRegistry {
    if (!BuiltinRegistry._instance) {
      BuiltinRegistry._instance = new BuiltinRegistry();
    }
    return BuiltinRegistry._instance;
  }

  /**
   * Registers a new built-in function in the registry.
   *
   * @param {string} name - The name of the built-in function to register
   * @param {BuiltinCallable} callable - The callable implementation of the function
   */
  public registerFunction(name: string, callable: BuiltinCallable): void {
    assert(!this.globals.has(name), "cannot redeclare: " + name);
    const builtin: BuiltinFunction = new BuiltinFunction(name, callable);
    this.globals.set(name, builtin);
  }

  public registerClass(clazz: SantaiBuiltinClass): void {
    assert(!this.globals.has(clazz.name), "cannot redeclare: " + clazz.name);
    this.globals.set(clazz.name, clazz);
  }

  /**
   * Get all registered built-in functions dan variables.
   *
   * @returns An immutable array of all registered built-in functions
   */
  public getAllBuiltins(): readonly (BuiltinFunction | SantaiBuiltinClass)[] {
    return Array.from(this.globals.values());
  }
}

/**
 * Registers a global function in the Santai language.
 * @param name - The name of the function to register globally
 * @param callable - The implementation of the function
 */
export function defineGlobalFunction(
  name: string,
  callable: BuiltinCallable
): void {
  BuiltinRegistry.getInstance().registerFunction(name, callable);
}

export function defineGlobalClass(clazz: SantaiBuiltinClass): void {
  BuiltinRegistry.getInstance().registerClass(clazz);
}

export function defineAndRegisterGlobalClass(clazz: SantaiBuiltinClass): void {
  defineGlobalClass(register(clazz));
}
