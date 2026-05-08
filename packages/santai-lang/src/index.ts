#!/usr/bin/env node

// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { runCli } from "@santai/cli";
import { writeError, ExitCode } from "@santai/core";

process.exitCode = (() => {
  try {
    return runCli(process.argv);
  } catch (err) {
    writeError(err);
    return ExitCode.UsageError;
  }
})();
