// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import * as config from "../base/config";
import { writeToStdout } from "../base/output";
import { Pipeline } from "../runtime/pipeline";
import { SourceFile } from "../runtime/sourceFile";

function printHelp(): void {
  writeToStdout(
    `${config.LANG_NAME} v${config.VERSION} — bahasa pemrograman dengan sintaks Indonesia\n` +
      `\n` +
      `Penggunaan:\n` +
      `  <file>       Jalankan file Santai\n` +
      `  -e "<kode>"             Evaluasi kode langsung\n` +
      `  --eval "<kode>"         Evaluasi kode langsung\n` +
      `  -h / --help             Tampilkan bantuan ini\n` +
      `  -v / --version          Tampilkan versi\n` +
      `\n`
  );
}

function printVersion(): void {
  writeToStdout(`${config.LANG_NAME} ${config.VERSION}\n`);
}

export function cmdHelp(): number {
  printHelp();
  return 0;
}

export function cmdVersion(): number {
  printVersion();
  return 0;
}

export function cmdEval(code: string): number {
  const source = SourceFile.fromString(code);
  return Pipeline.from(source).run().exitCode;
}

export function cmdRun(filepath: string): number {
  const source = SourceFile.fromFile(filepath);
  return Pipeline.from(source).run().exitCode;
}
