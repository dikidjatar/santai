// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import fs from "fs";
import path from "path";
import { isError } from "../base/types";
import * as meta from "../base/meta";

export class SourceFile {
  private constructor(
    readonly buffer: Uint8Array,
    readonly filepath: string
  ) {}

  static fromFile(filepath: string): SourceFile {
    const resolved = path.resolve(filepath);

    const ext = path.extname(resolved).toLowerCase();
    if (ext !== "" && !meta.LANG_EXTENSIONS.includes(ext)) {
      throw new Error(
        `Ekstensi file '${ext}' tidak dikenali.\n` +
          `  Gunakan ekstensi ${meta.LANG_EXTENSIONS.join(" atau ")} ` +
          `untuk file sumber ${meta.LANG_EXT}.`
      );
    }

    if (!fs.existsSync(resolved)) {
      throw new Error(`File tidak ditemukan: '${filepath}'`);
    }

    const stat = fs.statSync(resolved);
    if (!stat.isFile()) {
      throw new Error(`'${filepath}' bukan sebuah file`);
    }

    try {
      const buffer: Uint8Array = fs.readFileSync(resolved);
      return new SourceFile(buffer, filepath);
    } catch (error) {
      throw new Error(
        `Gagal membaca file: ${isError(error) ? error.message : String(error)}`
      );
    }
  }

  static fromString(code: string, label = "<eval>"): SourceFile {
    return new SourceFile(Buffer.from(code, "utf-8"), label);
  }
}
