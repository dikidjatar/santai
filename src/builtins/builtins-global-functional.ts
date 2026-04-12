// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { MessageTemplate } from "../base/messageTemplate";
import { isUndefined } from "../base/types";
import { Factory, SantaiFunction, SantaiObject } from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { SpecialName } from "../objects/specialNames";
import { defineGlobal } from "./globalProvider";
import { required } from "./paramSpec";

defineGlobal("panjang", () => {
  return Factory.NewBuiltinFunction(
    "panjang",
    ObjectUtil.wrapCallable((callsite, value) => {
      if (value.isInstance()) {
        const lengthMethod = value.getPropertyAs(SpecialName.__panjang__);
        if (isUndefined(lengthMethod)) {
          return callsite.throw(
            MessageTemplate.kObjectHasNoMember,
            value.typeName,
            "panjang"
          );
        }
        const returnValue = callsite.invoke(lengthMethod, []);
        if (!returnValue.isNumber()) {
          return callsite.throw(
            MessageTemplate.kInvalidReturnValue,
            (lengthMethod as SantaiFunction).name,
            `bukan-angka (tipenya ${returnValue.typeName})`
          );
        }
        return returnValue;
      }

      if (!value.hasLength()) {
        callsite.throw(
          MessageTemplate.kObjectHasNoMember,
          value.typeName,
          "panjang"
        );
      }

      return Factory.NewNumber(value.getLength());
    }),
    undefined,
    [required("nilai")]
  );
});

defineGlobal("saring", () => {
  return Factory.NewBuiltinFunction(
    "saring",
    ObjectUtil.wrapCallable((callsite, iterable, fn) => {
      if (!iterable.isIterable() || !Factory.IsCallable(fn)) {
        return Factory.NewList([]);
      }

      const result: SantaiObject[] = [];
      const iter = iterable.iterate();

      let next = iter.next();
      while (!next.done) {
        const item = next.value;
        const keep = callsite.invoke(fn, [item]);
        if (keep.isTruthy()) {
          result.push(item);
        }
        next = iter.next();
      }

      return Factory.NewList(result);
    }),
    undefined,
    [required("nilai"), required("_aksi")]
  );
});

defineGlobal("olah", () => {
  return Factory.NewBuiltinFunction(
    "olah",
    ObjectUtil.wrapCallable((callsite, iterable, fn) => {
      if (!iterable.isIterable() || !Factory.IsCallable(fn)) {
        return Factory.NewList([]);
      }

      const result: SantaiObject[] = [];
      const iter = iterable.iterate();

      let next = iter.next();
      while (!next.done) {
        result.push(callsite.invoke(fn, [next.value]));
        next = iter.next();
      }

      return Factory.NewList(result);
    }),
    undefined,
    [required("nilai"), required("_aksi")]
  );
});

defineGlobal("daftar_properti", () => {
  return Factory.NewBuiltinFunction(
    "daftar_properti",
    ObjectUtil.wrapCallable((callsite, object) => {
      const propertyMethod = object.getProperty(SpecialName.__daftarproperti__);
      if (propertyMethod) {
        const result = callsite.invoke(propertyMethod, []);
        return result;
      }
      return Factory.NewList([]);
    }),
    undefined,
    [required("objek")]
  );
});
