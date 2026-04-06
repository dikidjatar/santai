// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert } from "../base/asserts";
import {
  BuiltinFunction,
  Factory,
  SantaiBuiltinClass,
  SantaiObject,
} from "../objects/object";
import { register } from "../objects/typeRegistry";
import { defineBatchGlobals } from "./globalProvider";
import { BuiltinParam } from "./paramSpec";

/**
 * Interface to call back the Santai function from within the builtin.
 * ```
 * ┌─────────────────────────────────────────────────────┐
 * │                   builtin.ts                        │
 * │                                                     │
 * │  interface Callsite {                               │
 * │    invoke(fn, args): SantaiObject                   │
 * │  }                                ▲                 │
 * │                                   │ implements      │
 * │  type BuiltinCallable =           │                 │
 * │    (self, args, callsite) =>  ────┘                 │
 * │      SantaiObject                                   │
 * └─────────────────────────────────────────────────────┘
 *          ↑ depend on                ↑ depend on
 * ┌────────┴──────┐          ┌────────┴──────────────┐
 * │ functional.ts │          │    interpreter.ts     │
 * │               │          │                       │
 * │ fn(...)       │          │ class Interpreter     │
 * │  callsite     │          │   implements Callsite │
 * │   .invoke(fn) │          │                       │
 * │               │          │  invoke(fn, args) {   │
 * │               │          │    callFunction(fn)   │
 * │               │          │  }                    │
 * └───────────────┘          └───────────────────────┘
 * ```
 */
export interface CallSite {
  invoke(fn: SantaiObject, args: SantaiObject[]): SantaiObject;
}

export type BuiltinCallable = (
  self: SantaiObject | undefined,
  args: SantaiObject[],
  callsite: CallSite
) => SantaiObject;

export interface BuiltinDefinition {
  readonly name: string;
  readonly callable: BuiltinCallable;
}

export function arg(args: SantaiObject[], index: number): SantaiObject {
  return args[index] ?? Factory.Kosong;
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
  private readonly _globals: Map<string, SantaiObject> = new Map();

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
  public registerFunction(
    name: string,
    callable: BuiltinCallable,
    params?: readonly BuiltinParam[]
  ): void {
    assert(!this._globals.has(name), "cannot redeclare: " + name);
    const builtin: BuiltinFunction = Factory.NewBuiltinFunction(
      name,
      callable,
      undefined,
      params
    );
    this._globals.set(name, builtin);
  }

  public registerClass(clazz: SantaiBuiltinClass): void {
    assert(!this._globals.has(clazz.name), "cannot redeclare: " + clazz.name);
    this._globals.set(clazz.name, clazz);
  }

  /**
   * @internal — only called by the batch provider registered below
   */
  public snapshot(): ReadonlyMap<string, SantaiObject> {
    return this._globals;
  }
}

defineBatchGlobals(() => BuiltinRegistry.getInstance().snapshot());

/**
 * Registers a global function in the Santai language.
 * @param name - The name of the function to register globally
 * @param callable - The implementation of the function
 */
export function defineGlobalFunction(
  name: string,
  callable: BuiltinCallable,
  params?: readonly BuiltinParam[]
): void {
  BuiltinRegistry.getInstance().registerFunction(name, callable, params);
}

export function defineGlobalClass(clazz: SantaiBuiltinClass): void {
  BuiltinRegistry.getInstance().registerClass(clazz);
}

export function defineAndRegisterGlobalClass(clazz: SantaiBuiltinClass): void {
  defineGlobalClass(register(clazz));
}
