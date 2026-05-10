// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  CallSite,
  ExitCode,
  Interpreter,
  SantaiObject,
  SourceFile,
} from "@dikidjatar/santai-core";

export interface ReplEvalResult {
  readonly value: SantaiObject;
  readonly callsite?: CallSite;
}

export interface IRepl {
  run(): ExitCode;
}

export interface IReplPipeline {
  eval(source: SourceFile): ReplEvalResult;
  getInterpreter(): Interpreter;
}

export interface ReplSessionOptions {
  readonly prompt?: string;
}

export interface IReplSession {
  start(): void;
}
