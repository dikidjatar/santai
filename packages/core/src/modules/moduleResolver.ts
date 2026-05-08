// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import fs from "fs";
import path from "path";
import { ModulePath } from "../ast/ast";
import * as meta from "../base/meta";
import { isEmpty, isUndefined } from "../base/types";
import { ModuleLoadError, ModuleNotFoundError } from "./module";

const INIT_FILENAME = "__awal__";

function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Resolves a Santai modulepath
 *
 * Resolution rules:
 *
 * Absolute (`level = 0`):
 *   - Search each directory in `searchPaths` in order.
 *   - `impor abc` → look for `abc.santai` in each search path.
 *   - `impor abc.def` → look for `abc/def.santai`.
 *
 * Relative (`level >= 1`):
 *   - Start from the directory of `fromFile`.
 *   - One leading dot = same directory, two = parent, three = grandparent, …
 *   - `impor .abc` → `<current-dir>/abc.santai`
 *   - `impor ..abc.def` → `<parent-dir>/abc/def.santai`
 *
 * Directory package:
 *   - If the resolved path is a directory, look for `__awal__.<ext>` inside it.
 *   - `impor abc` where `abc/` is a folder → `abc/__awal__.santai`
 */
export class ModuleResolver {
  /**
   * Resolve a module path to an absolute file path.
   * @throws {ModuleLoadError} when the module cannot be found.
   */
  resolve(
    modulePath: ModulePath,
    fromFile: string,
    searchPaths: readonly string[]
  ): string {
    const { level, parts } = modulePath;

    return level > 0
      ? this.resolveRelative(level, parts, fromFile)
      : this.resolveAbsolute(parts, searchPaths);
  }

  private resolveRelative(
    level: number,
    parts: readonly string[],
    fromFile: string
  ): string {
    if (fromFile === "<eval>") {
      throw new ModuleLoadError(
        "Impor relatif tidak dapat digunakan dalam mode --eval."
      );
    }

    let base: string = path.dirname(path.resolve(fromFile));

    // Each additional dot moves one directory up.
    for (let i = 1; i < level; i++) {
      base = path.dirname(base);
    }

    const candidate = parts.length > 0 ? path.join(base, ...parts) : base;
    const result = this.probeFilePath(candidate);
    if (!isUndefined(result)) {
      return result;
    }

    throw new ModuleNotFoundError(candidate);
  }

  private resolveAbsolute(
    parts: readonly string[],
    searchPaths: readonly string[]
  ): string {
    for (const searchPath of searchPaths) {
      const candidate = path.join(searchPath, ...parts);
      const result = this.probeFilePath(candidate);
      if (!isUndefined(result)) {
        return result;
      }
    }

    throw new ModuleNotFoundError(parts.join("."));
  }

  private probeFilePath(candidate: string): string | undefined {
    const extension = path.extname(candidate).toLowerCase();

    if (isEmpty(extension) && meta.LANG_EXTENSIONS.includes(extension)) {
      if (isFile(candidate)) {
        return candidate;
      }
      return undefined;
    }

    for (const langExt of meta.LANG_EXTENSIONS) {
      const withExt = `${candidate}${langExt}`;
      if (isFile(withExt)) {
        return withExt;
      }
    }

    if (isDirectory(candidate)) {
      for (const langExt of meta.LANG_EXTENSIONS) {
        const init = path.join(candidate, `${INIT_FILENAME}${langExt}`);
        if (isFile(init)) {
          return init;
        }
      }
      return undefined;
    }
    return undefined;
  }
}
