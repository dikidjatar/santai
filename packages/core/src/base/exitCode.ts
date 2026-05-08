// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

export const ExitCode = {
  /**
   * Program completed without errors.
   */
  Success: 0,

  /**
   * A runtime error occurred.
   */
  RuntimeError: 1,

  /**
   * The user invoked the CLI incorrectly bad flag, missing argument, etc.
   */
  UsageError: 2,

  /**
   * The source file could not be read, or had parse / compile errors.
   */
  SourceError: 3,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];
