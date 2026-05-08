// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assertNever, unreachable } from "../base/asserts";
import { MessageTemplate } from "../base/messageTemplate";
import {
  isBoolean,
  isNumber,
  isObject,
  isString,
  isUndefinedOrNull,
} from "../base/types";
import {
  BuiltinFunction,
  Callable,
  CallSite,
  Factory,
  SantaiObject,
  SantaiPair,
} from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { registerPropertyProvider } from "../objects/propertyRegistry";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { asGetter, mapParams } from "./builtin-util";
import { defineGlobal } from "./globalProvider";
import { required } from "./paramSpec";

function method(
  fn: (
    callsite: CallSite,
    self: STJson,
    ...args: SantaiObject[]
  ) => SantaiObject
): Callable {
  return ObjectUtil.wrapMethod<STJson>({
    fn: (callsite, self, ...args) => fn(callsite, self, ...args),
    assertDescriptor: (callsite, self) =>
      ObjectUtil.checkObjectDescriptor(
        callsite,
        self,
        SantaiType.kJson,
        "json"
      ),
  });
}

class STJson extends SantaiObject {
  override readonly typeName: string = "json";
  private readonly methods: Map<string, BuiltinFunction> = new Map();

  constructor() {
    super(SantaiType.kJson);
    this.methods.set(
      "uraiin",
      Factory.NewBuiltinFunction(
        "uraiin",
        method((callsite, _self, text) => {
          if (!text.isString()) {
            assertNever(
              callsite.throw(
                MessageTemplate.kTypeError,
                "teks harus berupa teks tetapi yang diberikan %s",
                text.typeName
              )
            );
          }
          try {
            return this.parse(text.value);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            assertNever(callsite.throw(MessageTemplate.kSyntaxError, message));
          }
        }),
        undefined,
        [required("gue"), required("teks")]
      )
    );
    this.methods.set(
      "teksin",
      Factory.NewBuiltinFunction(
        "teksin",
        method((callsite, _, value) => {
          return Factory.NewString(
            JSON.stringify(this.convertToJsObject(callsite, value))
          );
        }),
        undefined,
        [required("gue"), required("teks_json")]
      )
    );
    this.methods.set(
      SpecialName.__teks__,
      Factory.NewBuiltinFunction(
        SpecialName.__teks__,
        method(() => Factory.NewString("json {}")),
        undefined,
        [required("gue")]
      )
    );
    this.methods.set(
      SpecialName.__logika__,
      Factory.NewBuiltinFunction(
        SpecialName.__logika__,
        method(() => Factory.Boolean(true)),
        undefined,
        [required("gue")]
      )
    );

    const methods = Array.from(this.methods.values());
    registerPropertyProvider(
      SantaiType.kJson,
      asGetter(methods),
      mapParams(methods)
    );
  }

  private parse(text: string): SantaiObject {
    return this.convertToSantaiObject(JSON.parse(text));
  }

  private convertToSantaiObject(value: unknown): SantaiObject {
    if (isString(value)) return Factory.NewString(value);
    if (isNumber(value)) return Factory.NewNumber(value);
    if (isUndefinedOrNull(value)) return Factory.Kosong;
    if (isBoolean(value)) return Factory.Boolean(value);
    if (Array.isArray(value)) {
      const results: SantaiObject[] = [];
      for (const item of value) {
        results.push(this.convertToSantaiObject(item));
      }
      return Factory.NewList(results);
    }
    if (isObject(value)) {
      const pairs: SantaiPair[] = [];
      for (const key of Object.keys(value)) {
        const obj = this.convertToSantaiObject((value as any)[key]);
        pairs.push(Factory.NewPair(key, obj));
      }
      return Factory.NewMap(pairs);
    }

    unreachable();
  }

  private convertToJsObject(callsite: CallSite, value: SantaiObject): any {
    if (value.isString() || value.isNumber() || value.isBoolean()) {
      return value.value;
    }
    if (value.isKosong()) return null;
    if (value.isList()) {
      const results: any[] = [];
      for (const item of value.elements) {
        results.push(this.convertToJsObject(callsite, item));
      }
      return results;
    }
    if (value.isPair()) {
      return {
        id: value.id,
        value: this.convertToJsObject(callsite, value.value),
      };
    }
    if (value.isMap()) {
      const results: Record<string, any> = {};
      for (const v of value.getValues()) {
        results[v.id] = this.convertToJsObject(callsite, v.value);
      }
      return results;
    }
    if (value.isInstance()) {
      const results: Record<string, any> = {};
      const properties = value.getOwnProperties();
      for (const [key, property] of properties) {
        results[key] = this.convertToJsObject(callsite, property);
      }
      return results;
    }
    return {};
  }
}

defineGlobal("json", () => new STJson());
