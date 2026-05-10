// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { ExitCode, SourceFile } from "@dikidjatar/santai-core";
import repl from "repl";
import {
  IReplPipeline,
  IReplSession,
  ReplEvalResult,
  ReplSessionOptions,
} from "./repl";

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
    this.server = repl.start({
      prompt: this.prompt,
      eval: this.eval.bind(this),
      ignoreUndefined: true,
      useGlobal: false,
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
