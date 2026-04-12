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
 * @param callsite - The call site context for invoking the method
 * @param specialMethod - The special method object to be invoked
 * @param checkReturnValue - A validation function that checks the return value and returns an error message if invalid, or undefined if valid
 * @param args - Optional array of arguments to pass to the special method (defaults to empty array)
 * @returns The validated return value of type T
 * @throws Throws an error if the return value validation fails, using the template MessageTemplate.kInvalidReturnValue
 *
 * @example
 * ```typescript
 * const result = callSpecialMethod<MyType>(
 *   callsite,
 *   myMethod,
 *   (value) => typeof value === 'string' ? undefined : 'Expected string',
 *   [arg1, arg2]
 * );
 * ```
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
 * Calls a special method on a SantaiObject with type checking and error handling.
 *
 * @template T - The expected return type of the special method, must extend SantaiObject
 * @param callsite - The call site context for error reporting
 * @param object - The SantaiObject instance on which to call the special method
 * @param specialName - The name of the special method to invoke
 * @param checkReturnValue - A function that validates the return value and returns an error message if invalid
 * @param args - Optional array of SantaiObject arguments to pass to the special method (defaults to empty array)
 * @returns The result of the special method call, cast to type T
 * @throws Throws an error via callsite if the object does not have the specified special method (kObjectHasNoMember)
 */
export function callObjectSpecialMethod<T extends SantaiObject>(
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
  return callSpecialMethod(callsite, specialMethod, checkReturnValue, args);
}
