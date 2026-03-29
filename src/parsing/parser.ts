// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert, assertDefined, unreachable } from "../base/asserts";
import {
  AstNodeFactory,
  Block,
  ClassMethod,
  Declaration,
  Expression,
  Statement,
} from "../base/ast";
import { ErrorHandler } from "../base/errorHandler";
import { MessageTemplate } from "../base/messageTemplate";
import { isUndefined } from "../base/types";
import { Variable, VariableMode } from "../base/variable";
import { makeLocation, Scanner, ScannerLocation } from "./scanner";
import { Token, TokenValue } from "./token";

/**
 * Token that marks the beginning of an argument.
 * Included tokens are unambiguous with binary operators:
 *   - Literal            : string, number, true, false, empty
 *   - Identifier         : variable or function name
 *   - Opening parenthesis: (grouped expression)
 *   - Unary 'not'        : not true
 *
 * Deliberately excluded tokens:
 *   - kSub (-) and kAdd (+): ambiguous -> `f -x` could mean `f(-x)` OR `f - x`
 *     For this case, parentheses are required: f(-x)
 */
function isNoParenArgStart(token: TokenValue): boolean {
  switch (token) {
    case TokenValue.kString:
    case TokenValue.kNumber:
    case TokenValue.kBenarLiteral:
    case TokenValue.kSalahLiteral:
    case TokenValue.kKosongLiteral:
    case TokenValue.kIdentifier:
    case TokenValue.kLeftParen:
    case TokenValue.kNot:
      return true;
    default:
      return false;
  }
}

interface ClassParseContext {
  /**
   * The name of the class being parsed.
   */
  readonly className: string;

  /**
   * Position of the keyword `gue` in the source.
   */
  readonly position: number;
}

export class Parser {
  private accept_IN = true;

  private readonly classContextStack: ClassParseContext[] = [];

  private get currentClassContext(): ClassParseContext | undefined {
    return this.classContextStack[this.classContextStack.length - 1];
  }

  constructor(
    private readonly scanner: Scanner,
    private readonly factory: AstNodeFactory,
    readonly errorHandler: ErrorHandler
  ) {}

  peek(): TokenValue {
    return this.scanner.peek();
  }

  next(): TokenValue {
    return this.scanner.next();
  }

  check(token: TokenValue): boolean {
    const next = this.scanner.peek();

    if (next === token) {
      this.scanner.next();
      return true;
    }

    return false;
  }

  expect(token: TokenValue): void {
    const next = this.next();

    if (next !== token) {
      this.reportUnexpectedToken(next);
    }
  }

  expectSemicolon() {
    const token = this.peek();

    if (token === TokenValue.kSemicolon) {
      this.next();
      return;
    }

    if (this.scanner.hasLineTerminator() || Token.isAutoSemicolon(token)) {
      return;
    }

    this.reportUnexpectedToken(this.next());
  }

  currentLiteral(): string {
    return this.scanner.currentLiteral();
  }
  position(): number {
    return this.scanner.location().beginPos;
  }
  peekPosition(): number {
    return this.scanner.peekLocation().beginPos;
  }

  reportUnexpectedToken(token: TokenValue): void {
    this.reportUnexpectedTokenAt(this.scanner.location(), token);
  }
  reportError(message: MessageTemplate, ...args: any[]): void {
    this.reportErrorAt(this.scanner.location(), message, ...args);
  }
  reportErrorAt(
    location: ScannerLocation,
    message: MessageTemplate,
    ...args: any[]
  ): void {
    this.errorHandler.reportErrorAt(location, message, ...args);
  }

  reportUnexpectedTokenAt(
    location: ScannerLocation,
    token: TokenValue,
    message: MessageTemplate = MessageTemplate.kInvalidOrUnexpectedToken
  ): void {
    let arg: string | undefined = undefined;

    switch (token) {
      case TokenValue.kNumber:
        message = MessageTemplate.kUnexpectedTokenNumber;
        break;

      case TokenValue.kString:
        message = MessageTemplate.kUnexpectedTokenString;
        break;

      case TokenValue.kIdentifier:
        message = MessageTemplate.kUnexpectedTokenIdentifier;
        this.reportErrorAt(location, message, this.currentLiteral());
        return;

      case TokenValue.kEos:
        message = MessageTemplate.kUnexpectedEOS;
        this.reportErrorAt(location, message);
        return;

      case TokenValue.kIllegal: {
        if (this.scanner.hasError()) {
          message = this.scanner.error();
          location = this.scanner.location();
        } else {
          message = MessageTemplate.kInvalidOrUnexpectedToken;
        }

        break;
      }

      default:
        arg = Token.string(token);
        break;
    }

    this.reportErrorAt(location, message, arg);
  }

  parseStatement(): Statement | undefined {
    switch (this.peek()) {
      case TokenValue.kLeftBrace:
        return this.parseBlock();
      case TokenValue.kKalo:
        return this.parseIfStatement();
      case TokenValue.kCoba:
        return this.parseTryStatement();
      case TokenValue.kLempar:
        return this.parseThrowStatement();
      case TokenValue.kTiap:
        return this.parseForInStatement();
      case TokenValue.kMumpung:
        return this.parseWhileStatement();
      case TokenValue.kIsi:
      case TokenValue.kTitip:
        return this.parseVariableDeclaration();
      case TokenValue.kAksi:
        return this.parseFunctionDeclaration();
      case TokenValue.kGue: {
        // Check whether this is a class declaration
        // or this-expression as a statement
        if (this.scanner.peekAhead() !== TokenValue.kIdentifier) {
          return this.parseExpressionStatement();
        }

        return this.parseClassDeclaration();
      }
      case TokenValue.kBalikin:
        return this.parseReturnStatement();
      case TokenValue.kStop:
        return this.parseBreakStatement();
      case TokenValue.kSkip:
        return this.parseContinueStatement();
      case TokenValue.kSemicolon:
        this.next();
        return this.factory.emptyStatement();
      default:
        return this.parseExpressionStatement();
    }
  }

  parseBlock(): Block | undefined {
    this.expect(TokenValue.kLeftBrace);

    const block = this.factory.newBlock();
    const statements: Statement[] = [];

    while (
      this.peek() !== TokenValue.kRightBrace &&
      this.peek() !== TokenValue.kEos
    ) {
      const statement = this.parseStatement();

      if (!statement) {
        return undefined;
      }

      if (!statement.isEmptyStatement()) {
        statements.push(statement);
      }
    }

    this.expect(TokenValue.kRightBrace);
    block.initializeStatements(statements);
    return block;
  }

  parseIfStatement(): Statement | undefined {
    const position = this.peekPosition();
    this.next();

    const condition = this.parseExpression();
    if (!condition) {
      return undefined;
    }

    const thenBranch = this.parseStatement();
    if (!thenBranch) {
      return undefined;
    }

    let elseBranch: Statement = this.factory.emptyStatement();
    if (this.check(TokenValue.kYaudah)) {
      elseBranch = this.parseStatement() ?? elseBranch;
    }

    return this.factory.newIfStatement(
      condition,
      thenBranch,
      elseBranch,
      position
    );
  }

  parseTryStatement(): Statement | undefined {
    this.next();
    const position = this.position();

    const body = this.parseStatement();
    if (!body) {
      return undefined;
    }

    let catchVariable: Variable | undefined;
    let catchBody: Statement | undefined;
    let finallyBody: Statement | undefined;

    if (this.check(TokenValue.kTangkap)) {
      const next = this.next();
      if (next !== TokenValue.kIdentifier) {
        this.reportUnexpectedToken(next);
      }

      catchVariable = new Variable(this.currentLiteral(), VariableMode.kVar);
      catchBody = this.parseStatement();

      if (!catchBody) {
        return undefined;
      }
    }

    if (this.check(TokenValue.kYaudah)) {
      finallyBody = this.parseStatement();
      if (!finallyBody) {
        return undefined;
      }
    }

    if (!catchBody && !finallyBody) {
      this.reportError(MessageTemplate.kUnexpectedEOS);
      return undefined;
    }

    return this.factory.newTryStatement(
      body,
      catchVariable,
      catchBody,
      finallyBody,
      position
    );
  }

  parseThrowStatement(): Statement | undefined {
    this.next();
    const position = this.position();

    const expression = this.parseExpression();
    if (!expression) {
      return undefined;
    }

    this.expectSemicolon();
    return this.factory.newThrowStatement(expression, position);
  }

  parseForInStatement(): Statement | undefined {
    const position = this.peekPosition();
    this.next();

    this.expect(TokenValue.kIdentifier);
    const name = this.currentLiteral();
    const loopVariable = new Variable(name, VariableMode.kVar);

    this.expect(TokenValue.kDi);
    const iterable: Expression | undefined = this.parseExpression();
    if (!iterable) {
      this.reportUnexpectedToken(this.next());
      return undefined;
    }

    const bodyBlock: Statement | undefined = this.parseStatement();
    if (!bodyBlock) {
      return undefined;
    }

    return this.factory.newForInStatement(
      loopVariable,
      iterable,
      bodyBlock,
      position
    );
  }

  parseWhileStatement(): Statement | undefined {
    const position = this.position();
    this.expect(TokenValue.kMumpung);

    const condition = this.parseExpression();
    if (!condition) {
      return undefined;
    }

    const body = this.parseStatement();
    if (!body) {
      return undefined;
    }

    return this.factory.newWhileStatement(condition, body, position);
  }

  parseVariableDeclaration(): Statement | undefined {
    const variableMode: VariableMode =
      this.peek() === TokenValue.kIsi ? VariableMode.kConst : VariableMode.kVar;
    const position = this.position();
    this.next();

    const declatarions: Declaration[] = [];

    do {
      if (this.peek() === TokenValue.kIdentifier) {
        const namePos = this.peekPosition();
        this.next();

        const name = this.currentLiteral();
        const variable = this.factory.newVariable(name, variableMode);

        let init: Expression | undefined = undefined;
        if (this.check(TokenValue.kAssign)) {
          init = this.parseExpression();
          if (!init) {
            return undefined;
          }
        } else if (variableMode === VariableMode.kConst) {
          this.reportErrorAt(
            this.scanner.location(),
            MessageTemplate.kConstDeclMissingInitialize
          );
        }

        const variableDeclaration = this.factory.newVariableDeclaration(
          variable,
          init,
          namePos
        );
        declatarions.push(variableDeclaration);
      } else {
        this.reportUnexpectedTokenAt(this.scanner.peekLocation(), this.peek());
        return undefined;
      }
    } while (this.check(TokenValue.kComma));

    this.expectSemicolon();

    if (declatarions.length === 1) {
      return declatarions[0];
    }

    const declarationList = this.factory.newDeclarationList(
      declatarions,
      position
    );
    return declarationList;
  }

  parseFunctionDeclaration(): Statement | undefined {
    this.next();
    const position = this.peekPosition();
    const nextToken = this.next();

    if (
      nextToken !== TokenValue.kIdentifier &&
      nextToken !== TokenValue.kAwal
    ) {
      this.reportUnexpectedToken(this.peek());
      return undefined;
    }

    const variable = this.factory.newVariable(
      this.currentLiteral(),
      VariableMode.kFunction
    );
    const parameters: Variable[] = [];

    if (this.peek() === TokenValue.kAmbil) {
      this.next();

      do {
        if (this.peek() !== TokenValue.kIdentifier) {
          this.reportUnexpectedToken(this.peek());
          return undefined;
        }

        this.next();
        const parameterName = this.currentLiteral();
        const parameterVariable = this.factory.newVariable(
          parameterName,
          VariableMode.kVar
        );

        parameters.push(parameterVariable);
      } while (this.check(TokenValue.kComma));
    }

    // if (this.peek() !== TokenValue.kLeftBrace) {
    //   this.reportUnexpectedToken(this.peek());
    //   return undefined;
    // }

    let body = this.parseStatement();
    if (!body) {
      return undefined;
    }

    if (!body.isBlock()) {
      const block = this.factory.newBlock();
      block.initializeStatements([body]);
      body = block;
    }

    return this.factory.newFunctionDeclaration(
      variable,
      parameters,
      body as Block,
      position
    );
  }

  parseClassDeclaration(): Statement | undefined {
    const position = this.peekPosition();
    this.next();
    this.expect(TokenValue.kIdentifier);

    const className = this.currentLiteral();

    this.expect(TokenValue.kLeftBrace);

    // Push class context before parsing body
    // From here on, the parser knows that it is inside the class `className`.
    // All `gue` found in the body will result
    // ThisExpression { className: className }.
    this.classContextStack.push({ className, position });

    const methods: ClassMethod[] = [];

    while (
      this.peek() !== TokenValue.kRightBrace &&
      this.peek() !== TokenValue.kEos
    ) {
      if (this.peek() !== TokenValue.kAksi) {
        this.reportUnexpectedTokenAt(this.scanner.peekLocation(), this.peek());
        return undefined;
      }

      const ahead = this.scanner.peekAhead();
      const isConstructor = ahead === TokenValue.kAwal;

      const fn = this.parseFunctionDeclaration();
      if (!fn || !fn.isFunctionDeclaration()) {
        return undefined;
      }

      const method = {
        name: fn.variable()!.name,
        isConstructor,
        body: fn.body,
        params: fn.params,
        position: fn.position,
      } satisfies ClassMethod;

      methods.push(method);
    }

    this.expect(TokenValue.kRightBrace);

    // Pop the class context when finished (including if there are errors)
    this.classContextStack.pop();

    return this.factory.newClassDeclaration(className, methods, position);
  }

  parseReturnStatement(): Statement | undefined {
    const position = this.peekPosition();
    this.next();

    let returnExpression: Expression | undefined = undefined;

    if (
      this.peek() !== TokenValue.kSemicolon &&
      !this.scanner.hasLineTerminator()
    ) {
      const expression = this.parseExpression();

      if (!expression) {
        this.expectSemicolon();
        return this.factory.newReturnStatement(undefined, position);
      }

      returnExpression = expression;
    }

    this.expectSemicolon();
    return this.factory.newReturnStatement(returnExpression, position);
  }

  parseBreakStatement(): Statement | undefined {
    this.next();
    this.expectSemicolon();
    return this.factory.newBreakStatement();
  }

  parseContinueStatement(): Statement | undefined {
    this.next();
    this.expectSemicolon();
    return this.factory.newContinueStatement();
  }

  parseExpressionStatement(): Statement | undefined {
    const expression = this.parseAssignmentExpression();
    if (!expression) {
      return undefined;
    }

    // ─── No-paren single-argument call: `ident arg` ──────────────────────────
    // Conditions:
    //   1. The parsed expression is a plain identifier (VariableExpression)
    //   2. There is no line terminator between the identifier and the next token
    //   3. The next token is a clear argument start (not a binary operator)
    // Valid examples:   spil 'halo'  |  spil hasil  |  salam (x + 1)
    // Invalid examples: spil 'halo', 'dunia'
    if (
      expression.isVariableExpression() &&
      !this.scanner.hasLineTerminator() &&
      isNoParenArgStart(this.peek())
    ) {
      const argumentPosition = this.peekPosition();
      const argument = this.parseAssignmentExpression();

      if (!argument) {
        return undefined;
      }

      this.expectSemicolon();

      return this.factory.newCall(
        expression,
        [argument],
        argumentPosition
      ) as unknown as Statement;
    }

    return expression;
  }

  parseExpression(): Expression | undefined {
    return this.parseAssignmentExpression();
  }

  parseAssignmentExpression(): Expression | undefined {
    // lowest precedence after the comma (if the comma is considered an operator).
    // a = b = 5 is evaluated as a = (b = 5)
    const position = this.peekPosition();
    const leftExpression = this.parseLogicalExpression();

    if (!leftExpression) {
      return undefined;
    }

    if (this.check(TokenValue.kAssign)) {
      const rightExpression = this.parseExpression();

      if (!rightExpression) {
        return undefined;
      }

      if (
        !leftExpression.isVariableExpression() &&
        !leftExpression.isProperty()
      ) {
        this.reportErrorAt(
          makeLocation(leftExpression.position, leftExpression.position + 1),
          MessageTemplate.kInvalidAssignmentTarget
        );

        return undefined;
      }

      return this.factory.newAssignment(
        leftExpression,
        rightExpression,
        position
      );
    }

    return leftExpression;
  }

  parseLogicalExpression(): Expression | undefined {
    let expression = this.parseBinaryExpression(9);

    if (!expression) {
      return undefined;
    }

    if (this.peek() === TokenValue.kDan || this.peek() === TokenValue.kAtau) {
      const prec1 = Token.precedence(this.peek(), this.accept_IN);
      expression = this.parseBinaryContinuation(expression, 4, prec1);
    }

    return expression;
  }

  parseBinaryExpression(prec: number): Expression | undefined {
    assert(prec >= 4);
    const expression = this.parseUnaryExpression();

    if (!expression) {
      return undefined;
    }

    const prec1 = Token.precedence(this.peek(), this.accept_IN);
    if (prec1 >= prec) {
      return this.parseBinaryContinuation(expression, prec, prec1);
    }

    return expression;
  }

  parseUnaryExpression(): Expression | undefined {
    const op = this.peek();

    if (Token.isUnaryOp(op)) {
      const pos = this.position();
      const op2 = this.next();
      const expression = this.parseUnaryExpression();

      if (!expression) {
        return undefined;
      }

      return this.buildUnaryExpression(expression, op2, pos);
    }

    return this.parsePostfixExpression();
  }

  parsePostfixExpression(): Expression | undefined {
    // TODO: --, ++
    return this.parseLeftHandSideExpression();
  }

  parseLeftHandSideExpression(): Expression | undefined {
    const expression = this.parseMemberExpression();

    if (!expression) {
      return undefined;
    }

    if (!Token.isPropertyOrCall(this.peek())) {
      return expression;
    }

    return this.parseMemberExpressionContinuation(expression);
  }

  parseMemberExpression(): Expression | undefined {
    let expression = this.parsePrimaryExpression();

    if (!expression) {
      return undefined;
    }

    if (Token.isPropertyOrCall(this.peek())) {
      expression = this.parseMemberExpressionContinuation(expression);
    }

    return expression;
  }

  private parseMemberExpressionContinuation(
    expression: Expression
  ): Expression | undefined {
    let expr: Expression = expression;

    do {
      switch (this.peek()) {
        // Property '.'
        case TokenValue.kPeriod: {
          this.next();
          const namePosition = this.position();

          if (this.peek() === TokenValue.kIdentifier) {
            this.next();
            const position = this.position();
            const property = this.factory.newStringLiteral(
              this.currentLiteral(),
              namePosition
            );

            expr = this.factory.newProperty(expr, property, position);
          } else {
            this.reportUnexpectedTokenAt(
              this.scanner.peekLocation(),
              this.peek()
            );
          }
          break;
        }

        // Index '[]'
        case TokenValue.kLeftBracket: {
          this.next();
          const position = this.position();
          const indexProperty = this.parseExpression();

          if (!indexProperty) {
            break;
          }

          expr = this.factory.newProperty(expr, indexProperty, position);
          this.expect(TokenValue.kRightBracket);
          break;
        }

        // Arguments
        case TokenValue.kLeftParen: {
          this.next();

          const position = this.position();
          const arguments_: Expression[] = [];
          const closingToken = TokenValue.kRightParen;

          while (this.peek() !== closingToken) {
            const expression = this.parseExpression();

            if (!expression) {
              break;
            }

            arguments_.push(expression);

            if (this.peek() !== closingToken) {
              this.expect(TokenValue.kComma);
              if (this.peek() == closingToken) {
                break;
              }
            }
          }

          this.expect(closingToken);
          expr = this.factory.newCall(expr, arguments_, position);
          break;
        }

        default:
          unreachable();
      }
    } while (Token.isPropertyOrCall(this.peek()));

    return expr;
  }

  parsePrimaryExpression(): Expression | undefined {
    const position = this.peekPosition();
    const token = this.peek();

    if (token === TokenValue.kIdentifier) {
      this.next();
      return this.factory.newVariableExpression(
        this.currentLiteral(),
        position
      );
    }

    if (Token.isLiteral(token)) {
      switch (this.next()) {
        case TokenValue.kKosongLiteral:
          return this.factory.newEmptyLiteral(position);
        case TokenValue.kBenarLiteral:
          return this.factory.newBooleanLiteral(true, position);
        case TokenValue.kSalahLiteral:
          return this.factory.newBooleanLiteral(false, position);
        case TokenValue.kNumber:
          return this.factory.newNumberLiteral(
            this.scanner.numberValue(),
            position
          );
        case TokenValue.kString:
          return this.factory.newStringLiteral(this.currentLiteral(), position);
        default:
          break;
      }

      return undefined;
    }

    switch (token) {
      case TokenValue.kLeftParen: {
        this.next();
        const expression = this.parseExpression();
        this.expect(TokenValue.kRightParen);
        return expression;
      }
      case TokenValue.kLeftBracket:
        return this.parseList();
      case TokenValue.kGue: {
        const position = this.position();
        const context = this.currentClassContext;

        this.next();

        if (isUndefined(context)) {
          // `gue` used outside of class
          this.reportError(MessageTemplate.kGueOutsideClass);
          return undefined;
        }

        return this.factory.newThisExpression(context.className, position);
      }
      default:
        break;
    }

    this.reportUnexpectedToken(this.next());
    return undefined;
  }

  private parseList(): Expression | undefined {
    const position = this.position();
    this.expect(TokenValue.kLeftBracket);
    const values: Expression[] = [];

    while (!this.check(TokenValue.kRightBracket)) {
      const element = this.parseExpression();

      if (!element) {
        return undefined;
      }

      values.push(element);

      if (this.peek() !== TokenValue.kRightBracket) {
        this.expect(TokenValue.kComma);
      }
    }

    return this.factory.newListLiteral(values, position);
  }

  private parseBinaryContinuation(
    expression: Expression,
    prec: number,
    prec1: number
  ): Expression | undefined {
    do {
      while (Token.precedence(this.peek(), this.accept_IN) === prec1) {
        const pos = this.peekPosition();
        let op = this.next();

        if (op === TokenValue.kItu) {
          if (this.peek() === TokenValue.kNot) {
            this.next();
            op = TokenValue.kNotEq;
          } else {
            op = TokenValue.kEq;
          }
        }

        const isRightAssociative = op === TokenValue.kExp;
        const nextPrec = isRightAssociative ? prec1 : prec1 + 1;
        const e = this.parseBinaryExpression(nextPrec);

        if (!e) {
          return undefined;
        }

        if (Token.isCompareOp(op)) {
          const cmp = op === TokenValue.kNotEq ? TokenValue.kEq : op;
          expression = this.factory.newBinaryOp(cmp, expression, e, pos);

          if (cmp !== op) {
            expression = this.factory.newUnaryOp(
              TokenValue.kNot,
              expression,
              pos
            );
          }
        } else {
          const evaluated = this.evaluateBinaryExpression(
            expression,
            e,
            op,
            pos
          );

          if (evaluated) {
            expression = evaluated;
          } else {
            expression = this.factory.newBinaryOp(op, expression, e, pos);
          }
        }
      }

      prec1--;
    } while (prec1 >= prec);

    return expression;
  }

  private buildUnaryExpression(
    expression: Expression,
    op: TokenValue,
    position: number
  ): Expression {
    assertDefined(expression);

    if (expression.isLiteral()) {
      if (op === TokenValue.kNot) {
        return this.factory.newBooleanLiteral(
          expression.toBooleanIsFalse(),
          position
        );
      } else if (expression.isNumberLiteral()) {
        const value: number = expression.asNumber();

        switch (op) {
          case TokenValue.kAdd:
            return expression;
          case TokenValue.kSub:
            return this.factory.newNumberLiteral(-value, position);
          default:
            break;
        }
      }
    }

    return this.factory.newUnaryOp(op, expression, position);
  }

  private evaluateBinaryExpression(
    x: Expression,
    y: Expression,
    op: TokenValue,
    pos: number
  ): Expression | undefined {
    if (
      x.isLiteral() &&
      x.isNumberLiteral() &&
      y.isLiteral() &&
      y.isNumberLiteral()
    ) {
      const xVal = x.asNumber();
      const yVal = y.asNumber();

      switch (op) {
        case TokenValue.kAdd:
          return this.factory.newNumberLiteral(xVal + yVal, pos);
        case TokenValue.kSub:
          return this.factory.newNumberLiteral(xVal - yVal, pos);
        case TokenValue.kMul:
          return this.factory.newNumberLiteral(xVal * yVal, pos);
        case TokenValue.kDiv: {
          if (yVal === 0) {
            this.reportError(MessageTemplate.kDivisionByZero);
          }

          return this.factory.newNumberLiteral(xVal / yVal, pos);
        }
        case TokenValue.kMod: {
          if (yVal === 0) {
            this.reportError(MessageTemplate.kIntegerModuleByZero);
          }

          return this.factory.newNumberLiteral(xVal % yVal, pos);
        }
        case TokenValue.kExp:
          return this.factory.newNumberLiteral(xVal ** yVal, pos);
        default:
          break;
      }
    }

    if (op === TokenValue.kAdd) {
      if (
        y.isLiteral() &&
        y.isStringLiteral() &&
        x.isLiteral() &&
        x.isStringLiteral()
      ) {
        const xVal = x.asStringLiteral();
        const yVal = y.asStringLiteral();
        return this.factory.newStringLiteral(xVal + yVal, pos);
      }
    }

    return undefined;
  }
}
