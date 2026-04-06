// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { ExitCode } from "../base/exitCode";
import { CliCommand, parseCliArgs } from "../cli/args";
import { cmdEval, cmdHelp, cmdRun, cmdVersion } from "../cli/commands";

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
