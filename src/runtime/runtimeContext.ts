// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

export interface RuntimeContext {
  /**
   * Absolute path to the Santai executable or the node binary in dev mode
   */
  readonly execPath: string;

  /**
   * Absolute path to the script being executed, or the sentinel value "<eval>"
   * when source code was supplied via the `-e` / `--eval` flag.
   */
  readonly scriptPath: string;

  /**
   * Arguments that were passed after the script filename on the command line.
   * Empty when running `--eval` or when the user supplies no extra args.
   */
  readonly args: readonly string[];
}

/**
 * Build a RuntimeContext for a script-file invocation.
 */
export function makeScriptContext(
  scriptPath: string,
  args: readonly string[]
): RuntimeContext {
  return {
    execPath: process.execPath,
    scriptPath,
    args,
  };
}

/**
 * Build a RuntimeContext for an inline `--eval` invocation.
 */
export function makeEvalContext(args: readonly string[] = []): RuntimeContext {
  return {
    execPath: process.execPath,
    scriptPath: "<eval>",
    args,
  };
}
