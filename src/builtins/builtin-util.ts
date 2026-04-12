// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  BuiltinClass,
  Callable,
  MethodArg,
  SantaiBoolean,
  SantaiError,
  SantaiList,
  SantaiNumber,
  SantaiObject,
  SantaiRange,
  SantaiString,
} from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { TokenValue } from "../parsing/token";
import { required } from "./paramSpec";

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
}
