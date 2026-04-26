// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { isObject } from "../base/types";

export class ModuleLoadError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "ModuleLoadError";
  }
}

export class ModuleNotFoundError extends ModuleLoadError {
  constructor(readonly path: string) {
    super();
    this.name = "ModuleNotFoundError";
  }
}

export class CircularImportError extends ModuleLoadError {
  constructor(
    readonly resolvedPath: string,
    readonly importChain: readonly string[]
  ) {
    super();
    this.name = "CircularImportError";
  }
}

export function isModuleLoadError(error: unknown): error is ModuleLoadError {
  return isObject(error) && error instanceof ModuleLoadError;
}

export function isModuleNotFoundError(
  error: unknown
): error is ModuleNotFoundError {
  return isModuleLoadError(error) && error.name === "ModuleNotFoundError";
}

export function isCircularImportError(
  error: unknown
): error is CircularImportError {
  return isModuleLoadError(error) && error.name === "CircularImportError";
}
