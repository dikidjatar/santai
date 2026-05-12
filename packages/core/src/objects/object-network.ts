// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { isUndefined } from "../base/types";
import { CallSite, Factory, SantaiObject } from "./object";
import { ObjectUtil } from "./object-util";
import { SantaiType } from "./st-type";

export class SantaiHttpResponse extends SantaiObject {
  override typeName: string = "ResponHttp";

  readonly headers: Map<string, string>;
  private readonly _body: Buffer;

  constructor(
    readonly ok: boolean,
    readonly url: string,
    /**
     * Body base64
     */
    bodyBase64: string,
    rawHeaders: Record<string, string>,
    readonly statusCode: number,
    readonly statusText: string,
    readonly redirect: boolean
  ) {
    super(SantaiType.kHttpResponse);
    this.headers = new Map(
      Object.entries(rawHeaders).map(([k, v]) => [k.toLowerCase(), v])
    );
    this._body = Buffer.from(bodyBase64, "base64");
  }

  getText(encoding: BufferEncoding = "utf-8"): string {
    return this._body.toString(encoding);
  }

  getBase64(): string {
    return this._body.toString("base64");
  }

  override getLength(): number {
    return this._body.length;
  }

  getHeader(name: string): string | undefined {
    return this.headers.get(name.toLowerCase());
  }

  getContentType(): string {
    return this.getHeader("content-type") ?? "";
  }

  override isTruthy(): boolean {
    return this.ok;
  }

  override inspect(): string {
    return `ResponHttp { status: ${this.statusCode}, url: "${this.url}" }`;
  }

  override getProperty(name: string): SantaiObject | undefined {
    const property = super.getProperty(name);
    if (!isUndefined(property)) return property;
    switch (name) {
      case "status":
        return Factory.NewNumber(this.statusCode);
      case "statusTeks":
        return Factory.NewString(this.statusText);
      case "ok":
        return Factory.Boolean(this.ok);
      case "url":
        return Factory.NewString(this.url);
      case "dialihkan":
        return Factory.Boolean(this.redirect);
      case "teks":
        return Factory.NewString(this.getText());
      case "base64":
        return Factory.NewString(this.getBase64());
      case "panjang":
        return Factory.NewNumber(this._body.length);
      case "tipe":
        return Factory.NewString(this.getContentType());
      default:
        return undefined;
    }
  }

  override dir(): readonly string[] {
    return [
      "status",
      "statusTeks",
      "oke",
      "url",
      "dialihkan",
      "isi",
      "base64",
      "panjang",
      "tipe",
      "kepala",
      "semuaKepala",
      "json",
      "cek",
    ].sort();
  }
}

export function assertIsHttpResponse(
  callsite: CallSite,
  self: SantaiObject
): asserts self is SantaiHttpResponse {
  ObjectUtil.checkObjectDescriptor(
    callsite,
    self,
    SantaiType.kHttpResponse,
    "ResponHttp"
  );
}
