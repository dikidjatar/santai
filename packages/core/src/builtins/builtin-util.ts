// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { isUndefined } from "../base/types";
import {
  BuiltinClass,
  BuiltinFunction,
  Callable,
  MethodArg,
  SantaiBoolean,
  SantaiError,
  SantaiList,
  SantaiMap,
  SantaiNumber,
  SantaiObject,
  SantaiRange,
  SantaiString,
} from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { PropertyGetter } from "../objects/propertyRegistry";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { TokenValue } from "../parsing/token";
import { required } from "./paramSpec";

export function mapParams(methods: readonly BuiltinFunction[]): string[] {
  return methods.map((method) => method.name);
}

export function asGetter(methods: readonly BuiltinFunction[]): PropertyGetter {
  return (name, self) => {
    const method = methods.find((n) => n.name === name);
    if (isUndefined(method)) return undefined;
    return method.bindAndCopy(self);
  };
}

export function wrapMethod<T extends SantaiObject>(
  type: SantaiType,
  typeName: string,
  fn: (self: T, ...args: SantaiObject[]) => SantaiObject
): Callable {
  return ObjectUtil.wrapMethod<T>({
    fn: (_, self, ...args) => fn(self, ...args),
    assertDescriptor: (callsite, self) =>
      ObjectUtil.checkObjectDescriptor(callsite, self, type, typeName),
  });
}

export namespace method {
  export function op(
    type: SantaiType,
    typename: string,
    name: SpecialName,
    op: TokenValue
  ): MethodArg {
    return [
      name,
      ObjectUtil.wrapMethodOp(op, (callsite, self) =>
        ObjectUtil.checkObjectDescriptor(callsite, self, type, typename)
      ),
      undefined,
      [required("gue"), required("nilai")],
    ];
  }

  export function string(
    fn: (self: SantaiString, ...args: SantaiObject[]) => SantaiObject
  ): Callable {
    return wrapMethod(SantaiType.kString, "teks", fn);
  }

  export function number(
    fn: (self: SantaiNumber, ...args: SantaiObject[]) => SantaiObject
  ): Callable {
    return wrapMethod(SantaiType.kNumber, "angka", fn);
  }

  export function boolean(
    fn: (self: SantaiBoolean, ...args: SantaiObject[]) => SantaiObject
  ): Callable {
    return wrapMethod(SantaiType.kBoolean, "logika", fn);
  }

  export function list(
    fn: (self: SantaiList, ...args: SantaiObject[]) => SantaiObject
  ): Callable {
    return wrapMethod(SantaiType.kList, "daftar", fn);
  }

  export function range(
    fn: (self: SantaiRange, ...args: SantaiObject[]) => SantaiObject
  ): Callable {
    return wrapMethod(SantaiType.kRange, "rentang", fn);
  }

  export function error(
    fn: (self: SantaiError, ...args: SantaiObject[]) => SantaiObject
  ): Callable {
    return wrapMethod(SantaiType.kError, "Masalah", fn);
  }

  export function type(
    fn: (self: BuiltinClass, ...args: SantaiObject[]) => SantaiObject
  ): Callable {
    return wrapMethod(SantaiType.kBuiltinClass, "tipe", fn);
  }

  export function map(
    fn: (self: SantaiMap, ...args: SantaiObject[]) => SantaiObject
  ): Callable {
    return wrapMethod(SantaiType.kMap, "Peta", fn);
  }
}

export function doIterator<T>(
  iterator: Iterable<T>,
  fn: (value: T) => void
): void {
  for (const value of iterator) {
    fn(value);
  }
}

export function getString(value: SantaiObject): string {
  if (value.isString() || value.isNumber()) {
    return value.value.toString();
  }
  return "";
}

export function getNumber(value: SantaiObject, or?: number): number {
  if (value.isNumber()) return value.value;
  if (!isUndefined(or)) return or;
  if (value.isString()) {
    const number = Number(value.value);
    return isNaN(number) ? 0 : number;
  }
  return 0;
}
