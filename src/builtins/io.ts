// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { writeLineToStdout } from "../base/output";
import { SantaiKosong, SantaiObject } from "../objects/object";
import { defineGlobalFunction } from "./builtin";

function joinArgs(args: SantaiObject[]): string {
  return args.map((a) => a.inspect()).join(" ");
}

//`tulis(...args)` — print arguments to stdout and add a newline.
// tulis "Hello World!" // Hello World!\n
defineGlobalFunction("tulis", (_self, args) => {
  writeLineToStdout(joinArgs(args));
  return SantaiKosong.INSTANCE;
});

// `spil(...args)` — alias for `tulis` (more relaxed).
defineGlobalFunction("spil", (_self, args) => {
  writeLineToStdout(joinArgs(args));
  return SantaiKosong.INSTANCE;
});
