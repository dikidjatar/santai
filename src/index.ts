// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { ExitCode } from "./base/exitCode";
import { writeError } from "./base/output";
import { main } from "./main/main";

process.exitCode = (() => {
  try {
    return main(process.argv);
  } catch (err) {
    writeError(err);
    return ExitCode.UsageError;
  }
})();
