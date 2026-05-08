// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { ExitCode } from "@santai/core";
import { CliCommand, parseCliArgs } from "./args";
import { cmdHelp, cmdVersion, cmdEval, cmdRun } from "./commands";

export function main(argv: string[]): ExitCode {
  let command: CliCommand;

  command = parseCliArgs(argv.slice(2));

  switch (command.kind) {
    case "help":
      return cmdHelp();
    case "version":
      return cmdVersion();
    case "eval":
      return cmdEval(command.code, command.args);
    case "run":
      return cmdRun(command.file, command.args);
  }
}
