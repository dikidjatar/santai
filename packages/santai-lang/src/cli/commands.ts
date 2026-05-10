// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  ExitCode,
  writeToStdout,
  LANG_NAME,
  LANG_DESCRIPTION,
  COPYRIGHT,
  LICENSE,
  LANG_HOMEPAGE,
  LANG_EXT,
  VERSION_FULL,
  writeLineToStdout,
  SourceFile,
  makeEvalContext,
  Pipeline,
  makeScriptContext,
  RuntimeContext,
  makeReplContext,
} from "@dikidjatar/santai-core";
import { ReplSession } from "../repl/replSession";
import { ReplPipeline } from "../repl/replPipeline";

function printHelp(): void {
  writeToStdout(
    `${LANG_NAME} — ${LANG_DESCRIPTION}\n` +
      `${COPYRIGHT} · Lisensi ${LICENSE}\n` +
      `${LANG_HOMEPAGE}\n` +
      `\n` +
      `Penggunaan:\n` +
      `  santai <file${LANG_EXT}>        Jalankan file sumber\n` +
      `  santai -e "<kode>"          Evaluasi kode secara langsung\n` +
      `  santai --eval "<kode>"      Evaluasi kode secara langsung\n` +
      `  santai -h / --help          Tampilkan bantuan ini\n` +
      `  santai -v / --version       Tampilkan versi\n` +
      `\n` +
      `Variabel lingkungan:\n` +
      `  SANTAI_DEBUG=1              Aktifkan output diagnostik internal\n` +
      `  SANTAI_MAX_ERRORS=<n>       Batas maksimum error (default: 20)\n` +
      `  SANTAI_STACK_LIMIT=<n>      Batas kedalaman call stack (default: 500)\n` +
      `  NO_COLOR=1                  Nonaktifkan warna ANSI di output\n` +
      `\n`
  );
}

function printVersion(): void {
  writeLineToStdout(VERSION_FULL);
}

export function cmdHelp(): ExitCode {
  printHelp();
  return ExitCode.Success;
}

export function cmdVersion(): ExitCode {
  printVersion();
  return ExitCode.Success;
}

export function cmdEval(code: string, args: readonly string[]): ExitCode {
  const source = SourceFile.fromString(code);
  const runtimeCtx = makeEvalContext(args);
  return Pipeline.from(source, runtimeCtx).run().exitCode;
}

export function cmdRun(filepath: string, args: readonly string[]): ExitCode {
  const source = SourceFile.fromFile(filepath);
  const runtimeCtx = makeScriptContext(filepath, args);
  return Pipeline.from(source, runtimeCtx).run().exitCode;
}

export function cmdRepl(): ExitCode {
  const runtimeContext: RuntimeContext = makeReplContext();
  const replPipeline: ReplPipeline = new ReplPipeline(runtimeContext);
  const repl: ReplSession = new ReplSession(replPipeline);
  repl.start();
  return ExitCode.Success;
}
