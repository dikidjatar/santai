// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  ExitCode,
  green,
  isUndefinedOrNull,
  meta,
  SantaiObject,
  SourceFile,
  writeLineToStdout,
  yellow,
} from "@dikidjatar/santai-core";
import repl from "repl";
import {
  IReplPipeline,
  IReplSession,
  ReplEvalResult,
  ReplSessionOptions,
} from "./repl";

function printWelcome(): void {
  writeLineToStdout(meta.VERSION_FULL);
  writeLineToStdout(meta.LANG_DESCRIPTION);
  writeLineToStdout("Ketik '.help' untuk bantuan atau '.exit' untuk keluar");
}

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
          return `'${green(obj.value)}'`;
        }

        if (obj.isNumber()) {
          return green(obj.value.toString());
        }

        if (obj.isBoolean()) {
          return yellow(obj.value ? "benar" : "salah");
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
