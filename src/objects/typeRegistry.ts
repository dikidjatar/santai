// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { SantaiObject } from "./object";
import { SantaiType } from "./st-type";

export interface ITypeRegistry {
  registerType<T extends SantaiObject>(obj: T, type: SantaiType): T;
  getTypeOf(obj: SantaiObject): SantaiObject | undefined;
}

class TypeRegistryImpl implements ITypeRegistry {
  private readonly _types = new Map<string, SantaiObject>();

  registerType<T extends SantaiObject>(obj: T, type: SantaiType): T {
    const id = this.id(obj, type);
    if (this._types.has(id)) {
      // throw new TypeError(`type ${id} already exsists`);
      return this._types.get(id) as T;
    }
    this._types.set(id, obj);
    return obj;
  }

  getTypeOf(obj: SantaiObject): SantaiObject | undefined {
    return this._types.get(this.id(obj, obj.type));
  }

  private id(obj: SantaiObject, type: SantaiType): string {
    return `${type}-${obj.typeName}`;
  }
}

export const TypeRegistry: ITypeRegistry = new TypeRegistryImpl();
