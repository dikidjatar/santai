// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import fs from "fs";
import { writeLineToStdout, writeToStdout } from "../base/output";
import { Factory, SantaiObject } from "../objects/object";
import { defineGlobalFunction } from "./builtin";
import { optional } from "./paramSpec";

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

// Simple implementation for input
defineGlobalFunction(
  "baca",
  (_, args) => {
    const prompt = args[0].inspect();
    if (prompt) writeToStdout(prompt);
    const buf = Buffer.alloc(1024);
    const n = fs.readSync(0, buf, 0, buf.length, null);
    return Factory.NewString(buf.subarray(0, n).toString().trimEnd());
  },
  [optional("pesan", Factory.NewString(""))]
);
