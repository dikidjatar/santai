// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import * as meta from "../base/meta";
import { isUndefined } from "../base/types";
import {
  BuiltinFunction,
  CallSite,
  Factory,
  GlobalMethodParam,
  SantaiObject,
} from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import { registerPropertyProvider } from "../objects/propertyRegistry";
import { coerceToString } from "../objects/protocol";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { RuntimeContext } from "../runtime/runtimeContext";
import { Tokens } from "../runtime/tokens";
import { asGetter, getNumber, mapParams } from "./builtin-util";
import { defineGlobal } from "./globalProvider";
import { optional, required } from "./paramSpec";

class STSystem extends SantaiObject {
  override readonly typeName: string = "sistem";
  private readonly _properties: Map<string, SantaiObject> = new Map();

  get properties(): [string, SantaiObject][] {
    return Array.from(this._properties.entries());
  }

  get propertyNames(): string[] {
    return [...this._properties.keys()];
  }

  constructor(readonly context: RuntimeContext) {
    super(SantaiType.kSystem);
    this._properties.set("versi", Factory.NewString(meta.VERSION_STRING));
    this._properties.set("nama", Factory.NewString(meta.LANG_NAME));
    this._properties.set("platform", Factory.NewString(process.platform));
    this._properties.set("direktori_kerja", Factory.NewString(process.cwd()));
    this._properties.set("jalur_eksekusi", Factory.NewString(context.execPath));
    this._properties.set("nodejs", Factory.NewString(context.node));
    this._properties.set("arsitektur", Factory.NewString(process.arch));
    this._properties.set(
      "argumen",
      Factory.NewList(context.args.map((arg) => Factory.NewString(arg)))
    );
    const envs = Object.entries(process.env).map(([key, value]) =>
      Factory.NewPair(key, value ? Factory.NewString(value) : Factory.Kosong)
    );
    this._properties.set("env", Factory.NewMap(envs));
  }

  override getProperty(name: string): SantaiObject | undefined {
    const property = this._properties.get(name);
    if (!isUndefined(property)) return property;
    return super.getProperty(name);
  }
}

function method(
  name: string,
  fn: (
    callsite: CallSite,
    self: STSystem,
    ...args: SantaiObject[]
  ) => SantaiObject,
  params?: GlobalMethodParam[]
): BuiltinFunction {
  return Factory.NewBuiltinFunction(
    name,
    ObjectUtil.wrapMethod({
      fn,
      assertDescriptor: (callsite, self) =>
        ObjectUtil.checkObjectDescriptor(
          callsite,
          self,
          SantaiType.kSystem,
          "sistem"
        ),
    }),
    undefined,
    [required("gue"), ...(params ? params : [])]
  );
}

const systemMethods: BuiltinFunction[] = [
  method(SpecialName.__teks__, (callsite, self) => {
    const entries = self.properties
      .map(([key, val]) => `${key}="${coerceToString(callsite, val) ?? ""}"`)
      .join(", ");
    return Factory.NewString(`sistem { ${entries} }`);
  }),
  method(SpecialName.__logika__, () => Factory.True),
  method(SpecialName.__daftarproperti__, (_, self) => {
    return Factory.NewList(
      [...self.propertyNames, ...mapParams(systemMethods)].map((name) =>
        Factory.NewString(name)
      )
    );
  }),
  method("keluar", (_, __, code) => process.exit(getNumber(code)), [
    optional("kode", Factory.NewNumber(0)),
  ]),
];

registerPropertyProvider(
  SantaiType.kSystem,
  asGetter(systemMethods),
  mapParams(systemMethods)
);

defineGlobal(
  "sistem",
  (serviceContainer) =>
    new STSystem(serviceContainer.get(Tokens.RuntimeContext))
);
