// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { ExitCode } from "../base/exitCode";
import * as meta from "../base/meta";
import { writeLineToStdout, writeToStdout } from "../base/output";
import { Pipeline } from "../runtime/pipeline";
import { makeEvalContext, makeScriptContext } from "../runtime/runtimeContext";
import { SourceFile } from "../runtime/sourceFile";

function printHelp(): void {
  writeToStdout(
    `${meta.LANG_NAME} — ${meta.LANG_DESCRIPTION}\n` +
      `${meta.COPYRIGHT} · Lisensi ${meta.LICENSE}\n` +
      `${meta.LANG_HOMEPAGE}\n` +
      `\n` +
      `Penggunaan:\n` +
      `  santai <file${meta.LANG_EXT}>        Jalankan file sumber\n` +
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
  writeLineToStdout(meta.VERSION_FULL);
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
