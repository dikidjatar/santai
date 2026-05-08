#!/usr/bin/env node

// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { writeError, ExitCode } from "@santai/core";
import { main } from "./main";

process.exitCode = (() => {
  try {
    return main(process.argv);
  } catch (err) {
    writeError(err);
    return ExitCode.UsageError;
  }
})();
