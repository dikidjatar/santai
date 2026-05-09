#!/usr/bin/env node

// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { ExitCode, writeError } from "@dikidjatar/santai-core";
import { runCli } from "./cli";

process.exitCode = (() => {
  try {
    return runCli(process.argv);
  } catch (err) {
    writeError(err);
    return ExitCode.UsageError;
  }
})();
