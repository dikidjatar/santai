// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { MessageTemplate } from "../base/messageTemplate";
import { isUndefined } from "../base/types";
import {
  CallSite,
  SantaiBoolean,
  SantaiFunction,
  SantaiObject,
  SantaiString,
} from "./object";
import { SpecialName } from "./specialNames";

export type SpecialMethodCheckReturnValue =
  | ((value: SantaiObject) => string | undefined)
  | undefined;

/**
 * Invokes a special method with validation of its return value.
 *
 * @template T - The expected return type that extends SantaiObject
 * @param checkReturnValue - A validation function that checks the return value and returns an error message if invalid, or undefined if valid
 * @throws Throws an error if the return value validation fails, using the template MessageTemplate.kInvalidReturnValue
 *
 */
export function callSpecialMethod<T extends SantaiObject>(
  callsite: CallSite,
  specialMethod: SantaiObject,
  checkReturnValue: SpecialMethodCheckReturnValue,
  args: SantaiObject[] = []
): T {
  const returnValue = callsite.invoke(specialMethod, args);
  const checkResult = checkReturnValue?.(returnValue as T);
  if (!isUndefined(checkResult)) {
    return callsite.throw(
      MessageTemplate.kInvalidReturnValue,
      (specialMethod as SantaiFunction).name,
      checkResult
    );
  }
  return returnValue as T;
}

/**
 * Calls a special method on a SantaiObject
 */
export function callObjectSpecialMethod<T extends SantaiObject>(
  callsite: CallSite,
  object: SantaiObject,
  specialName: SpecialName,
  checkReturnValue: SpecialMethodCheckReturnValue,
  args: SantaiObject[] = []
): T | undefined {
  const method = object.getProperty(specialName);
  if (isUndefined(method)) return undefined;
  return callSpecialMethod<T>(callsite, method, checkReturnValue, args);
}

/**
 * Calls a special method on a SantaiObject with throw.
 * @throws Throws an error via callsite if the object does not have the specified special method (kObjectHasNoMember)
 */
export function callObjectSpecialMethodWithThrow<T extends SantaiObject>(
  callsite: CallSite,
  object: SantaiObject,
  specialName: SpecialName,
  checkReturnValue: SpecialMethodCheckReturnValue,
  args: SantaiObject[] = []
): T {
  const specialMethod = object.getProperty(specialName);
  if (isUndefined(specialMethod)) {
    return callsite.throw(
      MessageTemplate.kObjectHasNoMember,
      object.typeName,
      specialName
    );
  }
  return callSpecialMethod<T>(callsite, specialMethod, checkReturnValue, args);
}

/**
 * Convert any Santai object to a JavaScript string.
 */
export function coerceToString(
  callsite: CallSite,
  object: SantaiObject
): string {
  const result = callObjectSpecialMethod<SantaiString>(
    callsite,
    object,
    SpecialName.__teks__,
    (returnValue) =>
      returnValue.isString()
        ? undefined
        : `bukan-teks (tipenya ${returnValue.typeName})`
  );
  return result ? result.value : object.inspect();
}

/**
 * Evaluate an object as a boolean
 */
export function evaluateTruthy(
  callsite: CallSite,
  object: SantaiObject
): boolean {
  const result = callObjectSpecialMethod<SantaiBoolean>(
    callsite,
    object,
    SpecialName.__logika__,
    (returnValue) =>
      returnValue.isBoolean()
        ? undefined
        : `bukan-logika (tipenya ${returnValue.typeName})`
  );
  return result ? result.value : object.isTruthy();
}

/**
 * Init santai object
 */
export function initObject<T extends SantaiObject>(
  callsite: CallSite,
  object: T,
  ...args: SantaiObject[]
): T {
  return callsite.invoke(object, args) as T;
}
