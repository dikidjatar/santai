// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert } from "../base/asserts";
import { BuiltinFunction, Factory, MethodArg } from "../objects/object";
import { ObjectUtil } from "../objects/object-util";
import {
  listPropertyNames,
  registerPropertyProvider,
} from "../objects/propertyRegistry";
import { SpecialName } from "../objects/specialNames";
import { SantaiType } from "../objects/st-type";
import { asGetter, mapParams } from "./builtin-util";
import { required } from "./paramSpec";

const class__daftarproperti__: MethodArg = [
  SpecialName.__daftarproperti__,
  ObjectUtil.wrapCallable((_, self) => {
    assert(self.isBuiltinClass());
    return Factory.NewList(
      listPropertyNames(self.santaiType).map((name) => Factory.NewString(name))
    );
  }),
  undefined,
  [required("gue")],
];

const classMethods: BuiltinFunction[] = [
  Factory.NewBuiltinFunction(...class__daftarproperti__),
];

registerPropertyProvider(
  SantaiType.kBuiltinClass,
  asGetter(classMethods),
  mapParams(classMethods)
);
