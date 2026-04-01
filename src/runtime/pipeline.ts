// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { AstNodeFactory, Statement } from "../base/ast";
import { ErrorHandler } from "../base/errorHandler";
import { Interpreter } from "../interpreter/interpreter";
import { Parser } from "../parsing/parser";
import { CharacterStream, Scanner } from "../parsing/scanner";
import { TokenValue } from "../parsing/token";
import { SourceFile } from "./sourceFile";

/**
 * Represents the result of a pipeline execution.
 * @property {number} exitCode - The exit code returned by the pipeline execution.
 */
export interface PipelineResult {
  readonly exitCode: number;
}

/**
 * Represents a compilation pipeline that processes source code through scanning, parsing, and interpretation phases.
 *
 * @private Constructor is private. Use {@link Pipeline.from} to create instances.
 */
export class Pipeline {
  private readonly characterStram: CharacterStream;
  private readonly scanner: Scanner;
  private readonly factory: AstNodeFactory;
  private readonly errorHandler: ErrorHandler;
  private readonly parser: Parser;

  private constructor(source: SourceFile) {
    this.characterStram = new CharacterStream(0, source.buffer);
    this.scanner = new Scanner(this.characterStram);
    this.factory = new AstNodeFactory();
    this.errorHandler = new ErrorHandler(this.characterStram, {
      filename: source.filepath,
    });
    this.parser = new Parser(this.scanner, this.factory, this.errorHandler);
  }

  /**
   * Creates a Pipeline instance from a source file.
   * @param source - The source file to process
   * @returns A new Pipeline instance
   */
  public static from(source: SourceFile) {
    return new Pipeline(source);
  }

  /**
   * Executes parsing and interpreting the source code.
   * @returns The result of pipeline execution with exit code
   */
  public run(): PipelineResult {
    const statements: Statement[] = this.parse();

    if (this.errorHandler.hasErrors()) {
      return this.result();
    }

    this.interpret(statements);
    return this.result();
  }

  private parse(): Statement[] {
    const statements: Statement[] = [];

    while (this.parser.peek() !== TokenValue.kEos) {
      const statement = this.parser.parseStatement();

      if (this.parser.errorHandler.hasErrors() || !statement) {
        break;
      }

      if (!statement.isEmptyStatement()) {
        statements.push(statement);
      }
    }

    return statements;
  }

  private interpret(statements: Statement[]): void {
    const interpreter: Interpreter = new Interpreter(this.errorHandler);
    const program = this.factory.newBlock();
    program.initializeStatements(statements);
    interpreter.execute(program);
  }

  private result(): PipelineResult {
    const errorCount = this.errorHandler.errorCount;
    return { exitCode: errorCount > 0 ? 1 : 0 };
  }
}
