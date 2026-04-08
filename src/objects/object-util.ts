// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert } from "../base/asserts";
import { SantaiObject } from "./object";
import { Operation } from "./operations";

export namespace ObjectUtil {
  export function Equals(left: SantaiObject, right: SantaiObject): boolean {
    const result = Operation.Eq(left, right);
    if (!result.ok) {
      return false;
    }
    assert(result.value.isBoolean());
    return result.value.value;
  }
}
