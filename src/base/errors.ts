// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

/**
 * This error indicates a bug.
 */
export class BugIndicatingError extends Error {
  constructor(message?: string) {
    super(message || "An unexpected bug occurred.");
    Object.setPrototypeOf(this, BugIndicatingError.prototype);
  }
}
