// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { isUndefined } from "./types";

function envBool(key: string, fallback = false): boolean {
  const val = process.env[key];
  if (isUndefined(val)) return fallback;
  // Treat "0" and "false" (case-insensitive) as false, anything else as true
  return val !== "0" && val.toLowerCase() !== "false" && val !== "";
}

function envInt(
  key: string,
  fallback: number,
  min: number,
  max: number
): number {
  const raw = process.env[key];
  if (isUndefined(raw)) return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/**
 * Enable verbose internal diagnostics.
 * Set `SANTAI_DEBUG=1` or any truthy value to activate.
 */
export const DEBUG: boolean = envBool("SANTAI_DEBUG");

/**
 * Disable ANSI colour output.
 * Respects the de-facto standard `NO_COLOR` environment variable.
 * @see https://no-color.org
 */
export const SUPPORT_COLOR: boolean = !envBool("NO_COLOR");

/**
 * Maximum number of errors before the pipeline aborts.
 * Override with `SANTAI_MAX_ERRORS=<n>`.
 */
export const MAX_ERRORS: number = envInt("SANTAI_MAX_ERRORS", 20, 1, 100);
