// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { SantaiModule } from "../objects/object";

type LoadState = "loading" | "loaded";

export class ModuleRegistry {
  private readonly _cache = new Map<string, SantaiModule>();
  private readonly _state = new Map<string, LoadState>();

  private readonly _loadStack: string[] = [];

  get loadChain(): readonly string[] {
    return this._loadStack;
  }

  has(absolutePath: string): boolean {
    return this._cache.has(absolutePath);
  }

  get(absolutePath: string): SantaiModule | undefined {
    return this._cache.get(absolutePath);
  }

  isLoading(absolutePath: string): boolean {
    return this._state.get(absolutePath) === "loading";
  }

  /**
   * Mark a module as loading before its source file is executed.
   * Must be paired with `register()` on success or `abortLoading()` on failure.
   */
  startLoading(absolutePath: string): void {
    this._state.set(absolutePath, "loading");
    this._loadStack.push(absolutePath);
  }

  /**
   * Store a successfully executed module and remove it from the loading stack.
   */
  register(absolutePath: string, mod: SantaiModule): void {
    this._cache.set(absolutePath, mod);
    this._state.set(absolutePath, "loaded");
    const idx = this._loadStack.lastIndexOf(absolutePath);
    if (idx !== -1) {
      this._loadStack.splice(idx, 1);
    }
  }

  /**
   * Remove a failed module from the loading stack so that future attempts
   */
  abortLoading(absolutePath: string): void {
    this._state.delete(absolutePath);
    const idx = this._loadStack.lastIndexOf(absolutePath);
    if (idx !== -1) {
      this._loadStack.splice(idx, 1);
    }
  }
}
