// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assertNever } from "../base/asserts";
import { MessageTemplate } from "../base/messageTemplate";
import { isUndefined } from "../base/types";
import { Factory, SantaiObject, SantaiString } from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { callObjectMethod } from "../objects/protocol";
import { defineGlobal, GlobalProvideRegistry } from "./globalProvider";
import { doHttpRequest, HttpOptions } from "./network";
import { optional, required } from "./paramSpec";

const defaultOptions: HttpOptions = {
  method: "GET",
  headers: {},
  timeout: 30_000,
  followRedirects: true,
};

function extractHeaders(obj: SantaiObject): Record<string, string> {
  if (!obj.isMap()) return {};
  const result: Record<string, string> = {};
  for (const [key, pair] of obj.getEntries()) {
    const value: SantaiObject = pair.value;
    if (value.isString()) {
      result[key] = value.value;
    } else if (value.isNumber()) {
      result[key] = String(value.value);
    }
  }
  return result;
}

function extractOptions(obj: SantaiObject): HttpOptions {
  if (!obj.isMap()) return { ...defaultOptions };
  const options: HttpOptions = {
    method: obj.getValue("metode", Factory.NewString("GET")).value,
    headers: {},
    timeout: obj.getValue("batas_waktu", Factory.NewNumber(30_000)).value,
    followRedirects: obj.getValue("alihkan", Factory.Boolean(true)).value,
  };

  const headers = obj.getValue("headers");
  if (!isUndefined(headers)) {
    options.headers = extractHeaders(headers);
  }

  const token = obj.getValue("otentik");
  if (token?.isString()) {
    options.headers["authorization"] = token.value;
  }

  const type = obj.getValue("tipe");
  if (type?.isString()) {
    options.headers["content-type"] = type.value;
  }

  const body =
    obj.getValue("body") || obj.getValue("isi") || obj.getValue("data");
  if (body?.isString()) {
    options.body = body.value;
  }

  return options;
}

defineGlobal("kunjungi", () => {
  return Factory.NewBuiltinFunction(
    "kunjungi",
    ObjectUtil.wrapCallable((callsite, url, data, _options) => {
      if (!url.isString()) {
        assertNever(
          callsite.throw(MessageTemplate.kTypeError, "URL harus berups teks")
        );
      }
      const options = extractOptions(_options);

      let body: string | undefined;
      if (data.isString()) {
        body = data.value;
        if (!options.headers["content-type"]) {
          options.headers["content-type"] = "text/plain";
        }
      } else if (data.isMap() || data.isList()) {
        const jsonObject = GlobalProvideRegistry.getResolvedGlobal("json");
        const result = callObjectMethod<SantaiString>(
          callsite,
          jsonObject,
          "teksin",
          [data]
        );
        body = result.value;
        if (!options.headers["content-type"]) {
          options.headers["content-type"] = "application/json";
        }
      } else if (!data.isKosong()) {
        body = String(data);
      }

      return doHttpRequest(url.value, options.method, options, body);
    }),
    undefined,
    [
      required("url"),
      optional("data", Factory.Kosong),
      optional("opsi", Factory.Kosong),
    ]
  );
});
