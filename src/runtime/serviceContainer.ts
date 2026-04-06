// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { ServiceToken } from "../base/serviceToken";

export class ServiceContainer {
  public constructor(
    private readonly _services: ReadonlyMap<symbol, unknown>
  ) {}

  /**
   * Resolve a service by token.
   * @throws {Error} if the token has not been provided.
   */
  public get<T>(token: ServiceToken<T>): T {
    if (!this._services.has(token._symbol)) {
      throw new Error(`service not found: ${token}`);
    }
    return this._services.get(token._symbol) as T;
  }

  /**
   * Resolve a service, returning undefined if not provided.
   */
  public find<T>(token: ServiceToken<T>): T | undefined {
    return this._services.get(token._symbol) as T | undefined;
  }

  public has<T>(token: ServiceToken<T>): boolean {
    return this._services.has(token._symbol);
  }

  public static builder(): ServiceContainerBuilder {
    return new ServiceContainerBuilder();
  }
}

export class ServiceContainerBuilder {
  private readonly _services = new Map<symbol, unknown>();

  public provide<T>(token: ServiceToken<T>, value: T): this {
    if (this._services.has(token._symbol)) {
      throw new Error(`token '${token}' has been registered.`);
    }
    this._services.set(token._symbol, value);
    return this;
  }

  public build(): ServiceContainer {
    // Pass a frozen copy so builder mutations after build() are harmless
    return new ServiceContainer(new Map(this._services));
  }
}
