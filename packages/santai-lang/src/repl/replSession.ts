// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  isUndefined,
  meta,
  SourceFile,
  writeLineToStdout,
} from "@dikidjatar/santai-core";
import repl from "repl";
import {
  IReplPipeline,
  IReplSession,
  ReplEvalResult,
  ReplSessionOptions,
} from "./repl";
import { ReplFormatter } from "./replFormatter";

function printWelcome(): void {
  writeLineToStdout(meta.VERSION_FULL);
  writeLineToStdout(meta.LANG_DESCRIPTION);
  writeLineToStdout("Ketik '.help' untuk bantuan atau '.exit' untuk keluar");
}

export class ReplSession implements IReplSession {
  private server!: repl.REPLServer;
  private formatter: ReplFormatter;
  private prompt: string;

  constructor(
    private readonly pipeline: IReplPipeline,
    options?: ReplSessionOptions
  ) {
    this.formatter = new ReplFormatter();
    this.prompt = options?.prompt ?? ">>> ";
  }

  start(): void {
    printWelcome();
    this.server = repl.start({
      prompt: this.prompt,
      eval: this.eval.bind(this),
      ignoreUndefined: true,
      useGlobal: false,
      writer: (obj) => this.formatter.format(obj),
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

    if (this.pipeline.isCodeIncomplete(source)) {
      return cb(new repl.Recoverable(new Error("incompleted code.")));
    }

    const result: ReplEvalResult = this.pipeline.eval(source);

    if (isUndefined(result.callsite) || result.value.isKosong()) {
      return cb(null, undefined);
    }

    cb(null, result);
  }
}
