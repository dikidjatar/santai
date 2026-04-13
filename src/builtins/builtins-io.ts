// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import fs from "fs";
import { writeLineToStdout, writeToStdout } from "../base/output";
import { CallSite, Factory, SantaiObject } from "../objects/object";
import { coerceToString } from "../objects/protocol";
import { defineGlobal } from "./globalProvider";

function getOutput(callsite: CallSite, args: SantaiObject[]): string {
  return args.map((arg) => coerceToString(callsite, arg)).join(" ");
}

// print arguments to stdout without newline.
defineGlobal("tulis", () => {
  return Factory.NewBuiltinFunction("tulis", (_, args, callsite) => {
    writeToStdout(getOutput(callsite, args));
    return Factory.Kosong;
  });
});

// print arguments to stdout and add a newline.
defineGlobal("spil", () => {
  return Factory.NewBuiltinFunction("spil", (_, args, callsite) => {
    writeLineToStdout(getOutput(callsite, args));
    return Factory.Kosong;
  });
});

// Simple implementation for input
defineGlobal("baca", () => {
  return Factory.NewBuiltinFunction("baca", (_, args) => {
    const prompt = args[0].inspect();
    if (prompt) writeToStdout(prompt);
    const buf = Buffer.alloc(1024);
    const n = fs.readSync(0, buf, 0, buf.length, null);
    return Factory.NewString(buf.subarray(0, n).toString().trimEnd());
  });
});
