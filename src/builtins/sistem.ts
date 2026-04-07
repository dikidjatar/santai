// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import * as meta from "../base/meta";
import { isUndefined } from "../base/types";
import { Factory, SantaiObject } from "../objects/object";
import { SantaiType } from "../objects/st-type";
import { TypeRegistry } from "../objects/typeRegistry";
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
  return TypeRegistry.registerType(
    new (class extends SantaiObject {
      override readonly typeName: string = "sistem";

      private readonly _argumen: SantaiObject;
      private readonly _exit: SantaiObject;
      private readonly _env: SantaiEnvMap;

      constructor(private readonly ctx: RuntimeContext) {
        super(SantaiType.kBuiltinClass);
        this._argumen = Factory.NewList(
          ctx.args.map((arg) => Factory.NewString(arg))
        );
        this._exit = Factory.NewBuiltinFunction(
          "keluar",
          (_self, args) => {
            const exitCode = args[0].isNumber() ? Math.trunc(args[0].value) : 0;
            process.exit(exitCode);
          },
          undefined,
          [optional("kode", Factory.NewNumber(0))]
        );
        this._env = TypeRegistry.registerType(new SantaiEnvMap());
      }

      override getProperty(name: string): SantaiObject | undefined {
        switch (name) {
          case "versi":
            return Factory.NewString(meta.VERSION_STRING);
          case "nama":
            return Factory.NewString(meta.LANG_NAME);
          case "platform":
            return Factory.NewString(process.platform);
          case "direktori_kerja":
            return Factory.NewString(process.cwd());
          case "jalur_eksekusi":
            return Factory.NewString(this.ctx.execPath);
          case "nodejs":
            return Factory.NewString(this.ctx.node);
          case "argumen":
            return this._argumen;
          case "env":
            return this._env;
          case "keluar":
            return this._exit;
          default:
            return undefined;
        }
      }

      override isTruthy(): boolean {
        return true;
      }

      override inspect(): string {
        return `<sistem ${meta.LANG_NAME} ${meta.VERSION_STRING}>`;
      }
    })(serviceContainer.get(Tokens.RuntimeContext))
  );
});
