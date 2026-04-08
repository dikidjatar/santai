// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import * as meta from "../base/meta";
import { isUndefined } from "../base/types";
import { Factory, SantaiObject } from "../objects/object";
import { SantaiType } from "../objects/st-type";
import { RuntimeContext } from "../runtime/runtimeContext";
import { Tokens } from "../runtime/tokens";
import { defineGlobal } from "./globalProvider";
import { optional } from "./paramSpec";

class SantaiEnvMap extends SantaiObject {
  override readonly typeName: string = "env";

  constructor() {
    super(SantaiType.kBuiltinClass);
  }

  override getProperty(name: string): SantaiObject | undefined {
    const value = process.env[name];
    return isUndefined(value) ? Factory.Kosong : Factory.NewString(value);
  }

  override dir(): readonly string[] {
    return Object.keys(process.env);
  }

  override isTruthy(): boolean {
    return true;
  }

  override inspect(): string {
    const entries = Object.entries(process.env)
      .map(([k, v]) => `${k}="${v ?? ""}"`)
      .join(", ");
    return `env { ${entries} }`;
  }
}

defineGlobal("sistem", (serviceContainer) => {
  return new (class extends SantaiObject {
    override readonly typeName: string = "sistem";

    private readonly _properties: Map<string, SantaiObject> = new Map();

    constructor(ctx: RuntimeContext) {
      super(SantaiType.kBuiltinClass);

      const exit = Factory.NewBuiltinFunction(
        "keluar",
        (_self, args) => {
          const exitCode = args[0].isNumber() ? Math.trunc(args[0].value) : 0;
          process.exit(exitCode);
        },
        undefined,
        [optional("kode", Factory.NewNumber(0))]
      );

      this.set("versi", Factory.NewString(meta.VERSION_STRING));
      this.set("nama", Factory.NewString(meta.LANG_NAME));
      this.set("platform", Factory.NewString(process.platform));
      this.set("direktori_kerja", Factory.NewString(process.cwd()));
      this.set("jalur_eksekusi", Factory.NewString(ctx.execPath));
      this.set("nodejs", Factory.NewString(ctx.node));
      this.set(
        "argumen",
        Factory.NewList(ctx.args.map((arg) => Factory.NewString(arg)))
      );
      this.set("env", new SantaiEnvMap());
      this.set("keluar", exit);
    }

    private set(name: string, value: SantaiObject): void {
      this._properties.set(name, value);
    }

    override getProperty(name: string): SantaiObject | undefined {
      return this._properties.get(name);
    }

    override dir(): readonly string[] {
      return [...this._properties.keys()].sort();
    }

    override isTruthy(): boolean {
      return true;
    }

    override inspect(): string {
      return `<sistem ${meta.LANG_NAME} ${meta.VERSION_STRING}>`;
    }
  })(serviceContainer.get(Tokens.RuntimeContext));
});
