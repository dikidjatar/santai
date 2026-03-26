// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import * as config from "./config";
import { isError } from "./types";

export function write(
  stream: NodeJS.WriteStream,
  buffer: string | Uint8Array
): boolean {
  return stream.write(buffer);
}

export function writeLine(stream: NodeJS.WriteStream, line: string): boolean {
  return write(stream, line + "\n");
}

export function writeToStdout(buffer: string | Uint8Array): boolean {
  return write(process.stdout, buffer);
}

export function writeLineToStdout(line: string): boolean {
  return write(process.stdout, line + "\n");
}

export function writeToStderr(buffer: string | Uint8Array): boolean {
  return write(process.stderr, buffer);
}

export function writeError(error: unknown): void {
  const message: string = isError(error)
    ? config.DEBUG && error.stack
      ? error.stack
      : error.message
    : String(error);
  writeLine(process.stderr, `${config.PROGRAM_NAME}: ${message}`);
}
