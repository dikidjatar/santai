// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  AstNodeFactory,
  Block,
  CharacterStream,
  config,
  ErrorHandler,
  ExitCode,
  Factory,
  Interpreter,
  isEmpty,
  ModuleSystem,
  Parser,
  RuntimeContext,
  Scanner,
  ServiceContainer,
  SourceContext,
  SourceFile,
  Statement,
  Tokens,
  TokenValue,
} from "@dikidjatar/santai-core";
import { IReplPipeline, ReplEvalResult } from "./repl";

export class ReplPipeline implements IReplPipeline {
  private readonly factory: AstNodeFactory;
  private readonly interpreter: Interpreter;

  constructor(runtimeContext: RuntimeContext) {
    const moduleSystem = ModuleSystem.create();
    const serviceContainer = ServiceContainer.builder()
      .provide(Tokens.RuntimeContext, runtimeContext)
      .provide(Tokens.ModuleSystem, moduleSystem)
      .build();

    this.factory = new AstNodeFactory();
    // Bootstrap with an empty source context
    const emptyBuffer: Buffer = Buffer.alloc(0);
    const bootstrapStream = new CharacterStream(0, emptyBuffer);
    const bootstrapErrorHandler = new ErrorHandler(bootstrapStream);
    const bootstrapSourceContext: SourceContext = {
      characterStream: bootstrapStream,
      filename: "<repl>",
    };
    this.interpreter = new Interpreter(
      bootstrapErrorHandler,
      serviceContainer,
      bootstrapSourceContext
    );
  }

  public eval(source: SourceFile): ReplEvalResult {
    const characterStream = new CharacterStream(0, source.buffer);
    const errorHandler = new ErrorHandler(characterStream, {
      filename: source.filepath,
      maxErrors: config.MAX_ERRORS,
    });
    const scanner: Scanner = new Scanner(characterStream);
    const parser: Parser = new Parser(scanner, this.factory, errorHandler);
    const sourceContext: SourceContext = {
      characterStream,
      filename: source.filepath,
    };
    this.interpreter.setErrorHandler(errorHandler);
    this.interpreter.setSourceContext(sourceContext);

    const statements: Statement[] = this.parse(parser);
    if (errorHandler.hasErrors()) {
      return { exitCode: ExitCode.SourceError, value: Factory.Kosong };
    }

    if (isEmpty(statements)) {
      return { exitCode: ExitCode.Success, value: Factory.Kosong };
    }

    const program: Block = this.factory.newBlock();
    program.initializeStatements(statements);
    const value = this.interpreter.execute(program);

    return {
      exitCode: errorHandler.hasErrors()
        ? ExitCode.RuntimeError
        : ExitCode.Success,
      value,
    };
  }

  private parse(parser: Parser): Statement[] {
    const statements: Statement[] = [];

    while (parser.peek() !== TokenValue.kEos) {
      const statement = parser.parseStatement();

      if (parser.errorHandler.hasErrors() || !statement) {
        break;
      }

      if (!statement.isEmptyStatement()) {
        statements.push(statement);
      }
    }

    return statements;
  }

  public getInterpreter(): Interpreter {
    return this.interpreter;
  }
}
