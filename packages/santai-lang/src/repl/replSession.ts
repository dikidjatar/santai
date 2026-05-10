// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  ExitCode,
  isUndefinedOrNull,
  LANG_DESCRIPTION,
  SantaiObject,
  SourceFile,
  VERSION_FULL,
  writeLineToStdout,
} from "@dikidjatar/santai-core";
import repl from "repl";
import {
  IReplPipeline,
  IReplSession,
  ReplEvalResult,
  ReplSessionOptions,
} from "./repl";

function printWelcome(): void {
  writeLineToStdout(VERSION_FULL);
  writeLineToStdout(LANG_DESCRIPTION);
  writeLineToStdout("Ketik '.help' untuk bantuan atau '.exit' untuk keluar");
}

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  // Text color
  gray: "\x1b[90m",
  blue: "\x1b[94m",
  green: "\x1b[92m",
  yellow: "\x1b[93m",
  red: "\x1b[91m",
  magenta: "\x1b[95m",
  cyan: "\x1b[96m",
  white: "\x1b[97m",
} as const;

export class ReplSession implements IReplSession {
  private server!: repl.REPLServer;
  private prompt: string;

  constructor(
    private readonly pipeline: IReplPipeline,
    options?: ReplSessionOptions
  ) {
    this.prompt = options?.prompt ?? ">>> ";
  }

  start(): void {
    printWelcome();
    this.server = repl.start({
      prompt: this.prompt,
      eval: this.eval.bind(this),
      ignoreUndefined: true,
      useGlobal: false,
      writer: (obj) => {
        if (isUndefinedOrNull(obj)) {
          return "";
        }

        if (!(obj instanceof SantaiObject)) {
          return String(obj);
        }

        if (obj.isString()) {
          return `${C.green}'${obj.value}'${C.reset}`;
        }

        if (obj.isNumber()) {
          return `${C.green}${obj.value}${C.reset}`;
        }

        if (obj.isBoolean()) {
          return `${C.yellow}${obj.value ? "benar" : "salah"}${C.reset}`;
        }

        return obj.inspect();
      },
    });
    this.server.on("exit", () => {
      writeLineToStdout("Bye!");
    });
  }

  private eval(
    code: string,
    _context: any,
    _filename: string,
    cb: (err: Error | null, result?: unknown) => void
  ): void {
    const source: SourceFile = SourceFile.fromString(code, "<repl>");
    const result: ReplEvalResult = this.pipeline.eval(source);
    if (result.exitCode !== ExitCode.Success) {
      return cb(null, undefined);
    }

    if (result.value.isKosong()) {
      return cb(null, undefined);
    }

    //TODO: handle and format value
    cb(null, result.value);
  }
}
