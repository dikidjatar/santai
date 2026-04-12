// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { MessageTemplate } from "../base/messageTemplate";
import { isUndefined } from "../base/types";
import { CallSite, SantaiFunction, SantaiObject } from "./object";
import { SpecialName } from "./specialNames";

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
  checkReturnValue: (value: SantaiObject) => string | undefined,
  args: SantaiObject[] = []
): T {
  const returnValue = callsite.invoke(specialMethod, args);
  const checkResult = checkReturnValue(returnValue as T);
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
  checkReturnValue: (value: SantaiObject) => string | undefined,
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
  checkReturnValue: (value: SantaiObject) => string | undefined,
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
