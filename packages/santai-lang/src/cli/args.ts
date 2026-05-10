// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

export type CliCommand =
  | {
      readonly kind: "run";
      readonly file: string;
      readonly args: readonly string[];
    }
  | {
      readonly kind: "eval";
      readonly code: string;
      readonly args: readonly string[];
    }
  | { readonly kind: "help" }
  | { readonly kind: "version" }
  | { readonly kind: "repl" };

/**
 * @param argv - process argument without first two elements
 *  (`node` and path script)
 *
 * @throws {CliParseError}
 */
export function parseCliArgs(argv: readonly string[]): CliCommand {
  if (argv.length === 0) {
    return { kind: "repl" };
  }

  const [flag, ...rest] = argv;

  switch (flag) {
    case "-h":
    case "--help":
      return { kind: "help" };

    case "-v":
    case "--version":
      return { kind: "version" };

    case "-r":
    case "--repl":
      return { kind: "repl" };

    case "-e":
    case "--eval": {
      const code = rest[0];
      if (code === undefined || code.trim() === "") {
        throw new Error(`Opsi '${flag}' membutuhkan argumen kode`);
      }
      return { kind: "eval", code, args: rest.slice(1) };
    }

    default: {
      if (!flag.startsWith("-")) {
        return { kind: "run", file: flag, args: rest };
      }
      throw new Error(`Opsi tidak dikenal: '${flag}'`);
    }
  }
}
