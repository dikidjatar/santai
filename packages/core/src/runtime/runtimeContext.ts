// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

function resolveSantaiPath(): readonly string[] {
  const raw = process.env["SANTAI_PATH"];
  if (!raw) {
    return [];
  }

  const separator = process.platform === "win32" ? ";" : ":";
  return raw
    .split(separator)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export interface RuntimeContext {
  /**
   * Node executable path
   */
  readonly node: string;

  /**
   * Absolute path to the Santai executable
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

  /**
   * Additional directories searched for module resolution.
   * Populated from the `SANTAI_PATH` environment variable
   */
  readonly moduleSearchPaths: readonly string[];
}

/**
 * Build a RuntimeContext for a script-file invocation.
 */
export function makeScriptContext(
  scriptPath: string,
  args: readonly string[]
): RuntimeContext {
  return {
    node: process.execPath,
    execPath: process.argv[1],
    scriptPath,
    args,
    moduleSearchPaths: resolveSantaiPath(),
  };
}

/**
 * Build a RuntimeContext for an inline `--eval` invocation.
 */
export function makeEvalContext(args: readonly string[] = []): RuntimeContext {
  return {
    node: process.execPath,
    execPath: process.argv[1],
    scriptPath: "<eval>",
    args,
    moduleSearchPaths: resolveSantaiPath(),
  };
}

export function makeReplContext(): RuntimeContext {
  return {
    node: process.execPath,
    execPath: "",
    scriptPath: "<repl>",
    args: [],
    moduleSearchPaths: resolveSantaiPath(),
  };
}
