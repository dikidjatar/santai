// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { CharacterStream, ScannerLocation } from "../parsing/scanner";
import { decode } from "../utils/decode";
import * as config from "./config";
import {
  MessageTemplate,
  MessageTemplateMood,
  MessageTemplateNote,
  MessageTemplateString,
  Mood,
} from "./messageTemplate";

const A = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  // Text color
  gray: "\x1b[90m",
  blue: "\x1b[94m",
  green: "\x1b[92m",
  yellow: "\x1b[93m",
  red: "\x1b[91m",
  magenta: "\x1b[95m",
  cyan: "\x1b[96m",
  white: "\x1b[97m",
} as const;

interface MoodStyle {
  readonly emoji: string;
  readonly ansi: string;
  readonly label: string; // "error"
  readonly gutter: string; // gutter color `│`
}

const MOOD_STYLE: Record<Mood, MoodStyle> = {
  [Mood.Marah]: { emoji: "😤", ansi: A.red, label: "error", gutter: A.red },
  [Mood.Sedih]: { emoji: "😢", ansi: A.blue, label: "error", gutter: A.blue },
  [Mood.Panik]: {
    emoji: "😱",
    ansi: A.magenta,
    label: "error",
    gutter: A.magenta,
  },
  [Mood.Bingung]: {
    emoji: "🤔",
    ansi: A.yellow,
    label: "error",
    gutter: A.yellow,
  },
  [Mood.Gila]: { emoji: "🤪", ansi: A.cyan, label: "error", gutter: A.cyan },
};

const enum Severity {
  Error,
  Warning,
  Note,
  Hint,
}

/**
 * One marker on the underscore/caret line of code.
 */
export interface DiagnosticLabel {
  readonly location: ScannerLocation;
  /**
   * Length of underline in characters
   */
  readonly length?: number;
  readonly message?: string;
  readonly severity?: Severity;
}

/**
 * One frame on the interpreter call stack
 */
export interface StackFrame {
  readonly functionName: string;
  readonly location: ScannerLocation;
  /**
   * Optional additional notes for this frame.
   */
  readonly note?: string;
}

export interface Diagnostic {
  readonly template?: MessageTemplate;
  readonly severity: Severity;
  readonly message: string;
  readonly primaryLabel: DiagnosticLabel;
  readonly secondaryLabels?: readonly DiagnosticLabel[];
  readonly note?: string;
  readonly stackFrames?: readonly StackFrame[];
}

export interface ErrorHandlerOptions {
  readonly filename?: string;
  readonly maxErrors?: number;
  readonly emitWarnings?: boolean;
  readonly outputStream?: NodeJS.WriteStream;
}

/**
 * Thrown when the number of errors exceeds `maxErrors`.
 */
export class SantaiError extends Error {
  constructor(
    public readonly diagnostic: Diagnostic,
    message: string
  ) {
    super(message);
    this.name = "SantaiError";
  }
}

interface LineColumn {
  readonly line: number;
  readonly column: number;
}

const BYTE_LF = 0x0a;
const BYTE_CR = 0x0d;

class SourceIndex {
  private readonly lineOffsets: Uint32Array;
  private readonly data: Uint8Array;
  private readonly lineCache: Map<number, string> = new Map();

  constructor(data: Uint8Array) {
    this.data = data;
    this.lineOffsets = SourceIndex.buildIndex(data);
  }

  get lineCount(): number {
    return this.lineOffsets.length;
  }

  getLine(lineNo: number): string {
    const cached = this.lineCache.get(lineNo);
    if (cached !== undefined) {
      return cached;
    }

    const idx = lineNo - 1;
    if (idx < 0 || idx >= this.lineOffsets.length) {
      return "";
    }

    const byteStart = this.lineOffsets[idx]!;
    let byteEnd: number;

    if (idx + 1 < this.lineOffsets.length) {
      byteEnd = this.lineOffsets[idx + 1]! - 1;

      if (byteEnd > byteStart && this.data[byteEnd - 1] === BYTE_CR) {
        byteEnd--;
      }
    } else {
      byteEnd = this.data.length;
    }

    const line = decode(this.data.subarray(byteStart, byteEnd));
    this.lineCache.set(lineNo, line);
    return line;
  }

  posToLineCol(pos: number): LineColumn {
    const offsets = this.lineOffsets;
    const len = offsets.length;

    if (pos <= 0 || len === 0) {
      return { line: 1, column: 1 };
    }

    if (pos >= this.data.length) {
      return { line: len, column: pos - offsets[len - 1]! + 1 };
    }

    let lo = 0;
    let hi = len - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (offsets[mid]! <= pos) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }

    return {
      line: lo + 1,
      column: pos - offsets[lo]! + 1,
    };
  }

  private static buildIndex(data: Uint8Array): Uint32Array {
    let lineCount = 1;
    for (let i = 0; i < data.length; i++) {
      if (data[i] === BYTE_LF) lineCount++;
    }

    const offsets = new Uint32Array(lineCount);
    offsets[0] = 0;
    let line = 1;
    for (let i = 0; i < data.length; i++) {
      if (data[i] === BYTE_LF) offsets[line++] = i + 1;
    }

    return offsets;
  }
}

const pad = (w: number) => " ".repeat(w);

/**
 * Converts a single `Diagnostic` to a performance ready string.
 *
 * Output format:
 * ```
 * 😤 error[S0017]: 'x' belum pernah ada — kamu manggil apa sih?
 *    ┌─ program.santai:5:8
 *    │
 *  5 │   spil x + 1
 *    │        ^ variabel ini belum ada
 *    │
 *    = saran: deklarasiin dulu pake 'titip nama = ...' atau 'isi nama = ...'
 *
 * ──── stack trace ─────────────────────────────────────────────
 *   3  (global)          program.santai:15:1
 *   2  aksi hitung       program.santai:10:5
 * → 1  aksi proses       program.santai:5:8    ← error di sini
 * ```
 */
class DiagnosticRenderer {
  private readonly useColor: boolean;
  private readonly index: SourceIndex;
  private readonly filename: string;

  constructor(index: SourceIndex, filename: string) {
    this.useColor = config.SUPPORT_COLOR;
    this.index = index;
    this.filename = filename;
  }

  private c(code: string, text: string): string {
    return this.useColor ? `${code}${text}${A.reset}` : text;
  }

  private bold(t: string) {
    return this.c(A.bold, t);
  }
  private dim(t: string) {
    return this.c(A.dim, t);
  }
  private gray(t: string) {
    return this.c(A.gray, t);
  }
  private green(t: string) {
    return this.c(A.green, t);
  }
  private blue(t: string) {
    return this.c(A.blue, t);
  }
  private moodC(mood: Mood, text: string): string {
    return this.c(MOOD_STYLE[mood].ansi, text);
  }

  /**
   * The width of the row number column
   */
  private gutterWidth(maxLine: number): number {
    return Math.max(String(maxLine).length, 2);
  }

  /** `  5 │ ` */
  private lineGutter(lineNo: number, w: number, gutterColor: string): string {
    const num = String(lineNo).padStart(w);
    return this.useColor
      ? `${A.gray}${num}${A.reset} ${gutterColor}│${A.reset} `
      : `${num} │ `;
  }

  /** `    │ ` (no number) */
  private emptyGutter(w: number, gutterColor: string): string {
    return this.useColor
      ? `${pad(w)} ${gutterColor}│${A.reset} `
      : `${pad(w)} │ `;
  }

  /** `    · ` (inter-block ellipsis) */
  private dotGutter(w: number): string {
    return this.gray(`${pad(w)} ·`);
  }

  render(diagnostic: Diagnostic): string {
    const mood = this.resolveMood(diagnostic);
    const style = MOOD_STYLE[mood];
    const out: string[] = [];

    this.renderHeader(diagnostic, style, out);
    this.renderFilePointer(diagnostic.primaryLabel.location, style, out);
    this.renderSnippet(
      [diagnostic.primaryLabel, ...(diagnostic.secondaryLabels ?? [])],
      style,
      out
    );

    if (diagnostic.note) {
      this.renderNote(diagnostic.note, out);
    }

    if (diagnostic.stackFrames?.length) {
      this.renderStackTrace(diagnostic.stackFrames, style, out);
    }

    return out.join("\n");
  }

  /**
   * ```
   * 😤 error[S0017]: 'x' belum pernah ada — kamu manggil apa sih?
   * ```
   */
  private renderHeader(
    diagnostic: Diagnostic,
    style: MoodStyle,
    out: string[]
  ): void {
    const templateId =
      diagnostic.template !== undefined
        ? `[S${String(diagnostic.template).padStart(4, "0")}]`
        : "";

    const label = this.bold(
      this.moodC(this.resolveMood(diagnostic), `${style.label}${templateId}`)
    );

    out.push(`${style.emoji} ${label}: ${this.bold(diagnostic.message)}`);
  }

  /**
   * ```
   *    ┌─ program.santai:5:8
   * ```
   */
  private renderFilePointer(
    loc: ScannerLocation,
    style: MoodStyle,
    out: string[]
  ): void {
    const { line, column } = this.index.posToLineCol(loc.beginPos);
    const width = this.gutterWidth(line + 2);
    const ptr = this.bold(`${this.filename}:${line}:${column}`);

    const arrow = this.useColor ? `${style.ansi}┌─${A.reset}` : "┌─";

    out.push(`${pad(width)} ${arrow} ${ptr}`);
  }

  private renderSnippet(
    labels: DiagnosticLabel[],
    style: MoodStyle,
    out: string[]
  ): void {
    if (labels.length === 0) {
      return;
    }

    interface Resolved {
      line: number;
      column: number;
      length: number;
      orig: DiagnosticLabel;
    }

    const resolved: Resolved[] = labels.map((lbl) => {
      const { line, column } = this.index.posToLineCol(lbl.location.beginPos);
      const length = lbl.length ?? Math.max(lbl.location.length(), 1);
      return { line, column, length, orig: lbl };
    });

    resolved.sort((a, b) =>
      a.line !== b.line ? a.line - b.line : a.column - b.column
    );

    const lineNos = [...new Set(resolved.map((r) => r.line))];
    const maxLn = (lineNos[lineNos.length - 1] ?? 1) + 1;
    const width = this.gutterWidth(maxLn);
    const gutterColor = this.useColor ? style.gutter : "";

    // Group labels by row
    const byLine = new Map<number, Resolved[]>();
    for (const r of resolved) {
      const bucket = byLine.get(r.line) ?? [];
      bucket.push(r);
      byLine.set(r.line, bucket);
    }

    out.push(this.emptyGutter(width, gutterColor));

    let previous: number | undefined = undefined;
    for (const ln of lineNos) {
      // Ellipsis if there are large line gaps
      if (previous !== undefined) {
        const gap = ln - previous;
        if (gap > 2) {
          out.push(this.dotGutter(width));
        } else if (gap === 2) {
          out.push(
            this.lineGutter(previous + 1, width, gutterColor) +
              this.index.getLine(previous + 1)
          );
        }
      }

      out.push(
        this.lineGutter(ln, width, gutterColor) + this.index.getLine(ln)
      );

      for (const r of byLine.get(ln) ?? []) {
        this.renderUnderline(r.column, r.length, r.orig, style, width, out);
      }

      previous = ln;
    }

    out.push(this.emptyGutter(width, gutterColor));
  }

  private renderUnderline(
    column: number,
    length: number,
    label: DiagnosticLabel,
    style: MoodStyle,
    width: number,
    out: string[]
  ): void {
    const gutterColor = this.useColor ? style.gutter : "";
    const col = column - 1;
    const marker = "^".repeat(Math.max(length, 1));
    const message = label.message
      ? ` ${this.useColor ? `${style.ansi}${label.message}${A.reset}` : label.message}`
      : "";

    const underline = this.useColor
      ? `${style.ansi}${marker}${A.reset}`
      : marker;

    out.push(
      this.emptyGutter(width, gutterColor) +
        " ".repeat(col) +
        underline +
        message
    );
  }

  /**
   * ```
   *    = saran: deklarasiin dulu pake 'titip nama = ...'
   * ```
   */
  private renderNote(note: string, out: string[]): void {
    const eq = this.bold(this.green("="));
    const label = this.bold(this.blue("saran"));
    out.push(`   ${eq} ${label}: ${note}`);
  }

  /**
   * ```
   * ──── stack trace ─────────────────────────────────────────────
   *   3  (global)          program.santai:15:1
   *   2  aksi hitung       program.santai:10:5
   * → 1  aksi proses       program.santai:5:8    ← error di sini
   * ```
   */
  private renderStackTrace(
    frames: readonly StackFrame[],
    style: MoodStyle,
    out: string[]
  ): void {
    const traceLabel = this.bold(this.gray(" stack trace "));
    out.push("");
    out.push(this.gray("────") + traceLabel + this.gray("─".repeat(42)));

    // Frame 1 = place of error, last frame = outermost
    // Display from outside to inside (outer frame largest number)
    const total = frames.length;

    for (let i = total - 1; i >= 0; i--) {
      const frame = frames[i]!;
      const num = total - i; // 1 = innermost (an error occurred)
      const isDeepest = num === 1;

      const { line, column } = this.index.posToLineCol(frame.location.beginPos);
      const loc = this.dim(`${this.filename}:${line}:${column}`);

      const numStr = String(num).padStart(3);
      const fnStr = `aksi ${frame.functionName}`.padEnd(20);
      const noteStr = frame.note ? this.dim(` — ${frame.note}`) : "";
      const errTag = isDeepest
        ? "  " +
          this.bold(
            this.moodC(this.resolveMoodFromStyle(style), "← error di sini")
          )
        : "";

      const arrow = isDeepest
        ? this.useColor
          ? `${style.ansi}→${A.reset}`
          : "→"
        : " ";

      const numFmt = isDeepest
        ? this.bold(this.moodC(this.resolveMoodFromStyle(style), numStr))
        : this.gray(numStr);

      const fnFmt = isDeepest ? this.bold(fnStr) : this.dim(fnStr);

      out.push(`${arrow} ${numFmt}  ${fnFmt}  ${loc}${noteStr}${errTag}`);
    }

    out.push(this.gray("─".repeat(60)));
  }

  private resolveMood(diag: Diagnostic): Mood {
    if (diag.template !== undefined) {
      return MessageTemplateMood[diag.template];
    }

    return diag.severity === Severity.Warning ? Mood.Bingung : Mood.Marah;
  }

  private resolveMoodFromStyle(style: MoodStyle): Mood {
    // Find the Mood again from the style (for re-coloring)
    for (const [mood, s] of Object.entries(MOOD_STYLE) as [
      string,
      MoodStyle,
    ][]) {
      if (s === style) {
        return Number(mood);
      }
    }

    return Mood.Marah;
  }
}

function formatMessage(template: MessageTemplate, args: unknown[]): string {
  let message = MessageTemplateString[template] ?? "error tidak dikenal";
  for (const arg of args) {
    if (arg !== null && arg !== undefined) {
      message = message.replace("%s", String(arg));
    }
  }
  return message;
}

export class ErrorHandler {
  private readonly _filename: string;
  private readonly _maxErrors: number;
  private readonly _output: NodeJS.WriteStream;
  private readonly _renderer: DiagnosticRenderer;

  private _errorCount: number = 0;
  get errorCount(): number {
    return this._errorCount;
  }

  private _warningCount: number = 0;

  private _diagnostics: Diagnostic[] = [];
  get diagnostics(): readonly Diagnostic[] {
    return this._diagnostics;
  }

  constructor(
    sourceStream: CharacterStream,
    options: ErrorHandlerOptions = {}
  ) {
    const index = new SourceIndex(sourceStream.getRawData());
    this._filename = options.filename ?? "<stdin>";
    this._maxErrors = options.maxErrors ?? 20;
    this._output = options.outputStream ?? process.stderr;
    this._renderer = new DiagnosticRenderer(index, this._filename);
  }

  hasErrors(): boolean {
    return this._errorCount > 0;
  }

  reportErrorAt(
    location: ScannerLocation,
    template: MessageTemplate,
    ...args: unknown[]
  ): void {
    this.emit({
      template,
      severity: Severity.Error,
      message: formatMessage(template, args),
      primaryLabel: { location, message: "di sini" },
      note: MessageTemplateNote[template],
    });
  }

  /**
   * Like `reportErrorAt` but includes the call stack of the interpreter.
   * Used by `Interpreter.report()` when a function is running.
   */
  reportErrorWithStack(
    location: ScannerLocation,
    template: MessageTemplate,
    stackFrames: StackFrame[],
    ...args: unknown[]
  ): void {
    this.emit({
      template,
      severity: Severity.Error,
      message: formatMessage(template, args),
      primaryLabel: { location, message: "di sini" },
      note: MessageTemplateNote[template],
      stackFrames,
    });
  }

  summary(): boolean {
    if (this._errorCount === 0 && this._warningCount === 0) {
      return false;
    }

    const parts: string[] = [];
    if (this._errorCount > 0) {
      parts.push(`${this._errorCount} error`);
    }

    if (this._warningCount > 0) {
      parts.push(`${this._warningCount} peringatan`);
    }

    this._output.write(
      `\n${parts.join(", ")} ditemukan dalam "${this._filename}"\n`
    );

    return this._errorCount > 0;
  }

  private emit(diag: Diagnostic): void {
    this._diagnostics.push(diag);

    if (diag.severity === Severity.Error) {
      this._errorCount++;
    } else if (diag.severity === Severity.Warning) {
      this._warningCount++;
    }

    // One write() per diagnostic — avoids interleaving in concurrent output
    this._output.write("\n" + this._renderer.render(diag) + "\n");

    if (this._maxErrors > 0 && this._errorCount >= this._maxErrors) {
      const msg = `\nTerlalu banyak error (${this._maxErrors}). Hentiin dulu.\n`;
      this._output.write(msg);
      throw new SantaiError(diag, msg);
    }
  }
}
