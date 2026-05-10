// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  CallSite,
  coerceToString,
  green,
  isUndefinedOrNull,
  SantaiList,
  SantaiObject,
  yellow,
} from "@dikidjatar/santai-core";
import { ReplEvalResult } from "./repl";

function formatValue(callsite: CallSite, value: SantaiObject): string {
  if (value.isString()) return green(`'${coerceToString(callsite, value)}'`);
  if (value.isNumber()) return yellow(coerceToString(callsite, value));
  if (value.isBoolean()) return yellow(coerceToString(callsite, value));
  if (value.isList()) return formatList(callsite, value);

  return coerceToString(callsite, value);
}

function formatList(callsite: CallSite, list: SantaiList): string {
  const elements = list.elements
    .map((element) => formatValue(callsite, element))
    .join(", ");
  return `[${elements}]`;
}

export class ReplFormatter {
  public format(obj: ReplEvalResult | undefined | null): string {
    if (isUndefinedOrNull(obj)) return "";
    return formatValue(obj.callsite!, obj.value);
  }
}
