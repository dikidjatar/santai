// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

/**
 * Standard text color
 */
const TextColor = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
} as const;

/**
 * Text style
 */
const TextStyle = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  reverse: "\x1b[7m",
  strikethrough: "\x1b[9m",
} as const;

export const Color = {
  ...TextColor,
  ...TextStyle,
} as const;

export type Color = keyof typeof Color;
export type TextColor = keyof typeof TextColor;
export type TextStyle = keyof typeof TextStyle;

export function colorize(text: string, color: Color): string {
  return `${Color[color]}${text}${TextStyle.reset}`;
}

export function red(text: string): string {
  return colorize(text, "red");
}

export function green(text: string): string {
  return colorize(text, "green");
}

export function yellow(text: string): string {
  return colorize(text, "yellow");
}

export function blue(text: string): string {
  return colorize(text, "blue");
}

export function cyan(text: string): string {
  return colorize(text, "cyan");
}

export function magenta(text: string): string {
  return colorize(text, "magenta");
}

export function gray(text: string): string {
  return colorize(text, "gray");
}

export function bold(text: string): string {
  return colorize(text, "bold");
}

export function italic(text: string): string {
  return colorize(text, "italic");
}

export function dim(text: string): string {
  return colorize(text, "dim");
}

/**
 * Reset all ANSI codes (typically used at end of output)
 * @returns ANSI reset code
 */
export function reset(): string {
  return TextStyle.reset;
}
