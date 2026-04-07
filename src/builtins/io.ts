// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { writeLineToStdout, writeToStdout } from "../base/output";
import { Factory, SantaiObject } from "../objects/object";
import { defineGlobalFunction } from "./builtin";

function joinArgs(args: SantaiObject[]): string {
  return args.map((a) => a.inspect()).join(" ");
}

// print arguments to stdout without newline.
defineGlobalFunction("tulis", (_self, args) => {
  writeToStdout(joinArgs(args));
  return Factory.Kosong;
});

// print arguments to stdout and add a newline.
defineGlobalFunction("spil", (_self, args) => {
  writeLineToStdout(joinArgs(args));
  return Factory.Kosong;
});
