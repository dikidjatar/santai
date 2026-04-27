// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { AstNodeFactory, Statement } from "../ast/ast";
import { SourceContext } from "../ast/sourceContext";
import { MAX_ERRORS } from "../base/config";
import { ErrorHandler } from "../base/errorHandler";
import { ExitCode } from "../base/exitCode";
import { Interpreter } from "../interpreter/interpreter";
import { ModuleSystem } from "../modules/moduleSystem";
import { Parser } from "../parsing/parser";
import { CharacterStream, Scanner } from "../parsing/scanner";
import { TokenValue } from "../parsing/token";
import { RuntimeContext } from "./runtimeContext";
import { ServiceContainer } from "./serviceContainer";
import { SourceFile } from "./sourceFile";
import { Tokens } from "./tokens";

/**
 * Represents the result of a pipeline execution.
 * @property {number} exitCode - The exit code returned by the pipeline execution.
 */
export interface PipelineResult {
  readonly exitCode: ExitCode;
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
  private readonly interpreter: Interpreter;
  private readonly sourceContext: SourceContext;

  private constructor(
    source: SourceFile,
    private readonly runtimeCtx: RuntimeContext
  ) {
    this.characterStram = new CharacterStream(0, source.buffer);
    this.scanner = new Scanner(this.characterStram);
    this.factory = new AstNodeFactory();
    this.errorHandler = new ErrorHandler(this.characterStram, {
      filename: source.filepath,
      maxErrors: MAX_ERRORS,
    });
    this.parser = new Parser(this.scanner, this.factory, this.errorHandler);
    const moduleSystem = ModuleSystem.create();

    const container = ServiceContainer.builder()
      .provide(Tokens.RuntimeContext, this.runtimeCtx)
      .provide(Tokens.ModuleSystem, moduleSystem)
      .build();

    this.sourceContext = {
      characterStream: this.characterStram,
      filename: source.filepath,
    };
    this.interpreter = new Interpreter(
      this.errorHandler,
      container,
      this.sourceContext
    );
  }

  public getInterpreter(): Interpreter {
    return this.interpreter;
  }

  public getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  /**
   * Creates a Pipeline instance from a source file.
   * @param source - The source file to process
   * @returns A new Pipeline instance
   */
  public static from(source: SourceFile, runtimeCtx: RuntimeContext) {
    return new Pipeline(source, runtimeCtx);
  }

  /**
   * Executes parsing and interpreting the source code.
   * @returns The result of pipeline execution with exit code
   */
  public run(): PipelineResult {
    const statements: Statement[] = this.parse();

    if (this.errorHandler.hasErrors()) {
      return { exitCode: ExitCode.SourceError };
    }

    this.interpret(statements);

    return {
      exitCode: this.errorHandler.hasErrors()
        ? ExitCode.RuntimeError
        : ExitCode.Success,
    };
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
    const program = this.factory.newBlock();
    program.initializeStatements(statements);
    this.interpreter.execute(program);
  }
}
