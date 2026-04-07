// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { SantaiBuiltinClass, SantaiObject } from "./object";
import { SantaiType } from "./st-type";

export interface ITypeRegistry {
  registerType(cls: SantaiBuiltinClass): SantaiBuiltinClass;
  getTypeOf(obj: SantaiObject): SantaiBuiltinClass | undefined;
}

class TypeRegistryImpl implements ITypeRegistry {
  private readonly _types = new Map<SantaiType, SantaiBuiltinClass>();

  registerType(cls: SantaiBuiltinClass): SantaiBuiltinClass {
    this._types.set(cls.santaiType, cls);
    return cls;
  }

  getTypeOf(obj: SantaiObject): SantaiBuiltinClass | undefined {
    return this._types.get(obj.type);
  }
}

export const TypeRegistry: ITypeRegistry = new TypeRegistryImpl();
