// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import path from "path";
import { ModulePath } from "../ast/ast";
import { SantaiModule } from "../objects/object";
import { CircularImportError, ModuleLoadError } from "./module";
import { ModuleLoader } from "./moduleLoader";
import { ModuleRegistry } from "./moduleRegistry";
import { ModuleResolver } from "./moduleResolver";
import { ModuleRunner } from "./moduleRunner";

/**
 * Single public API exposed through the `ServiceContainer`
 */
export class ModuleSystem {
  private readonly _registry: ModuleRegistry;
  private readonly _resolver: ModuleResolver;
  private readonly _loader: ModuleLoader;
  private readonly _runner: ModuleRunner;

  private constructor(registry: ModuleRegistry, resolver: ModuleResolver) {
    this._registry = registry;
    this._resolver = resolver;
    this._loader = new ModuleLoader();
    this._runner = new ModuleRunner();
  }

  static create(): ModuleSystem {
    const registry = new ModuleRegistry();
    const resolver = new ModuleResolver();
    return new ModuleSystem(registry, resolver);
  }

  import(
    modulePath: ModulePath,
    fromFile: string,
    searchPaths: readonly string[]
  ): SantaiModule {
    const absolutePath = this._resolver.resolve(
      modulePath,
      fromFile,
      searchPaths
    );

    if (this._registry.has(absolutePath)) {
      return this._registry.get(absolutePath)!;
    }

    if (this._registry.isLoading(absolutePath)) {
      throw new CircularImportError(absolutePath, this._registry.loadChain);
    }

    this._registry.startLoading(absolutePath);

    try {
      const source = this._loader.load(absolutePath);
      const mod = this._runner.run(source);
      this._registry.register(absolutePath, mod);
      return mod;
    } catch (error) {
      this._registry.abortLoading(absolutePath);
      // Rethrow ModuleLoadErrors verbatim, wrap anything unexpected.
      if (error instanceof ModuleLoadError) throw error;
      const reason = error instanceof Error ? error.message : String(error);
      throw new ModuleLoadError(`${path.basename(absolutePath)}: ${reason}`);
    }
  }
}
