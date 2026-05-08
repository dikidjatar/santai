// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

/**
 * A typed, nominal token used to register and resolve services from a
 * ServiceContainer. The generic parameter T is the type of the service;
 */
export class ServiceToken<_T> {
  /**
   * @internal Unique symbol that backs this token's identity.
   */
  public readonly _symbol: symbol;

  /**
   * Human-readable name used in error messages.
   */
  public readonly name: string;

  private constructor(name: string) {
    this.name = name;
    this._symbol = Symbol(name);
  }

  public toString(): string {
    return `ServiceToken(${this.name})`;
  }

  public static create<T>(name: string): ServiceToken<T> {
    return new ServiceToken<T>(name);
  }
}

/**
 * Convenience factory for {@link ServiceToken}.
 */
export function createToken<T>(name: string): ServiceToken<T> {
  return ServiceToken.create<T>(name);
}
