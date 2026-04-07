// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { SantaiObject } from "./object";

export interface ITypeRegistry {
  registerType<T extends SantaiObject>(obj: T): T;
  getTypeOf(obj: SantaiObject): SantaiObject | undefined;
}

class TypeRegistryImpl implements ITypeRegistry {
  private readonly _types = new Map<string, SantaiObject>();

  registerType<T extends SantaiObject>(obj: T): T {
    this._types.set(this.id(obj), obj);
    return obj;
  }

  getTypeOf(obj: SantaiObject): SantaiObject | undefined {
    return this._types.get(this.id(obj));
  }

  private id(obj: SantaiObject): string {
    return `${obj.isBuiltinClass() ? obj.santaiType : obj.type}-${obj.typeName}`;
  }
}

export const TypeRegistry: ITypeRegistry = new TypeRegistryImpl();
