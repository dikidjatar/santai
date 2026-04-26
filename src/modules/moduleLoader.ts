// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { SourceFile } from "../runtime/sourceFile";
import { ModuleLoadError } from "./module";

/**
 * Thin wrapper around `SourceFile.fromFile` that translates file-system errors
 * into `ModuleLoadError` with module-specific context.
 */
export class ModuleLoader {
  /**
   * Load module file
   * @throws {ModuleLoadError} if the file cannot be read.
   */
  load(path: string): SourceFile {
    try {
      return SourceFile.fromFile(path);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new ModuleLoadError(reason);
    }
  }
}
