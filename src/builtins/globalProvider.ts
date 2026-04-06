// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { SantaiObject } from "../objects/object";
import { ServiceContainer } from "../runtime/serviceContainer";

export interface SingleGlobalProvider {
  readonly kind: "single";
  readonly name: string;
  create(container: ServiceContainer): SantaiObject;
}

export interface BatchGlobalProvider {
  readonly kind: "batch";
  resolve(container: ServiceContainer): ReadonlyMap<string, SantaiObject>;
}

export type GlobalProvider = SingleGlobalProvider | BatchGlobalProvider;

class GlobalProviderRegistry {
  private readonly _providers: GlobalProvider[] = [];

  register(provider: GlobalProvider): void {
    if (provider.kind === "single") {
      const duplicate = this._providers.find(
        (p) => p.kind === "single" && p.name === provider.name
      );
      if (duplicate) {
        throw new Error(`global '${provider.name}' has been registered.`);
      }
    }
    this._providers.push(provider);
  }

  /**
   * Resolve all registered globals using the given container.
   */
  resolveAll(container: ServiceContainer): ReadonlyMap<string, SantaiObject> {
    const result = new Map<string, SantaiObject>();

    for (const provider of this._providers) {
      if (provider.kind === "single") {
        result.set(provider.name, provider.create(container));
      } else {
        for (const [name, value] of provider.resolve(container)) {
          result.set(name, value);
        }
      }
    }

    return result;
  }
}

export const globalProvideRegistry = new GlobalProviderRegistry();

/**
 * Register a single named global. The factory receives the ServiceContainer
 * so it can resolve injected services
 *
 * Call this at module top-level so registration happens at import time.
 *
 * @example — no context needed
 *   defineGlobal("panjang", () =>
 *     Factory.NewBuiltinFunction("panjang", ...)
 *   );
 *
 * @example — context-aware global
 *   defineGlobal("sistem", (container) =>
 *     new SantaiSistem(container.get(Tokens.RuntimeContext))
 *   );
 */
export function defineGlobal(
  name: string,
  factory: (container: ServiceContainer) => SantaiObject
): void {
  globalProvideRegistry.register({ kind: "single", name, create: factory });
}

/**
 * Register a batch provider — used by the legacy BuiltinFunctionModule to
 * expose all `defineGlobalFunction` / `defineGlobalClass` registrations under
 * the new system without migrating each call site individually.
 *
 * @internal — prefer defineGlobal for new code
 */
export function defineBatchGlobals(
  resolver: (container: ServiceContainer) => ReadonlyMap<string, SantaiObject>
): void {
  globalProvideRegistry.register({ kind: "batch", resolve: resolver });
}
