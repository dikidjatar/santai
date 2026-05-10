// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  ExitCode,
  Interpreter,
  SantaiObject,
  SourceFile,
} from "@dikidjatar/santai-core";

export interface ReplEvalResult {
  readonly exitCode: ExitCode;
  readonly value: SantaiObject;
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
