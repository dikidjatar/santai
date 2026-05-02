// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  BuiltinFunction,
  Factory,
  GlobalMethodParam,
  SantaiModule,
  SantaiObject,
} from "../objects/object";
import { registerPropertyProvider } from "../objects/propertyRegistry";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { asGetter, getString, mapParams, wrapMethod } from "./builtin-util";
import { required } from "./paramSpec";

const moduleMethods: BuiltinFunction[] = [];

function method(
  name: string,
  fn: (self: SantaiModule, ...args: SantaiObject[]) => SantaiObject,
  params?: GlobalMethodParam[]
): void {
  moduleMethods.push(
    Factory.NewBuiltinFunction(
      name,
      wrapMethod(SantaiType.kModule, "module", fn),
      undefined,
      [required("gue"), ...(params ? params : [])]
    )
  );
}

method(
  SpecialName.__awal__,
  (_, moduleName, modulePath, _exports) => {
    if (!moduleName.isString() || !modulePath.isString() || !_exports.isMap()) {
      return Factory.NewModule("", "", new Map());
    }

    const exports = new Map(
      _exports.getEntries().map(([, value]) => [value.id, value.value])
    );
    return Factory.NewModule(moduleName.value, modulePath.value, exports);
  },
  [required("nama"), required("jalur"), required("exports")]
);

method(
  SpecialName.__ambilproperti__,
  (self, name) => {
    const _export = self.getExport(getString(name));
    if (!_export) return Factory.Kosong;
    return _export;
  },
  [required("nama")]
);

method(SpecialName.__daftarproperti__, (self) => {
  return Factory.NewList([
    ...self.getNames().map((name) => Factory.NewString(name)),
    ...moduleMethods.map((mehod) => Factory.NewString(mehod.name)),
  ]);
});

registerPropertyProvider(
  SantaiType.kModule,
  asGetter(moduleMethods),
  mapParams(moduleMethods)
);
