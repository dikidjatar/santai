// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  CallSite,
  Factory,
  GlobalMethodParam,
  SantaiObject,
} from "../objects/object";
import { initObject } from "../objects/protocol";
import { defineGlobal, GlobalProvideRegistry } from "./globalProvider";
import { optional, required } from "./paramSpec";

function defineGlobalFunction(
  name: string,
  callable: (callsite: CallSite, ...args: SantaiObject[]) => SantaiObject,
  params?: GlobalMethodParam[]
): void {
  defineGlobal(name, () =>
    Factory.NewBuiltinFunction(
      name,
      (_, args, callsite) => callable(callsite, ...args),
      undefined,
      params
    )
  );
}

["pasangin", "pasangan", "pasangkan"].forEach((name) =>
  defineGlobalFunction(
    name,
    (callsite, ...args) =>
      initObject(
        callsite,
        GlobalProvideRegistry.getResolvedGlobal("Pasang"),
        ...args
      ),
    [required("id"), required("nilai")]
  )
);

["petain", "petakan"].forEach((name) =>
  defineGlobalFunction(
    name,
    (callsite, ...args) =>
      initObject(
        callsite,
        GlobalProvideRegistry.getResolvedGlobal("Peta"),
        ...args
      ),
    [optional("pasangan", Factory.NewList([]))]
  )
);
