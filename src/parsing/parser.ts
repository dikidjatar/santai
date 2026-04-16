// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  AstNodeFactory,
  Block,
  CallArgument,
  ClassMethod,
  Declaration,
  Expression,
  Parameter,
  Statement,
} from "../ast/ast";
import { Variable, VariableMode } from "../ast/variable";
import { assert, assertDefined, unreachable } from "../base/asserts";
import { ErrorHandler } from "../base/errorHandler";
import { MessageTemplate } from "../base/messageTemplate";
import { isUndefined } from "../base/types";
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
    case TokenValue.kTemplateHead:
    case TokenValue.kNumber:
    case TokenValue.kBenarLiteral:
    case TokenValue.kSalahLiteral:
    case TokenValue.kKosongLiteral:
    case TokenValue.kIdentifier:
    case TokenValue.kLeftParen:
    case TokenValue.kNot:
    case TokenValue.kGue:
      return true;
    default:
      return false;
  }
}

/**
 * Infix calls occupy precedence level 11. A clean gap between:
 * ```
 *   Arithmetic     : 12
 *   Infix calls    : 11
 *   Comparison     : 10
 * ```
 *
 * This means:
 * ```
 *   x + y mirip z     -> (x + y).mirip(z)  // [arithmetic binds tighter than infix]
 *   x mirip y == z    -> x.mirip(y) == z   // [infix binds tighter than comparison]
 *   x mirip y dan z   -> x.mirip(y) dan z  // [infix binds tighter than logical]
 * ```
 *
 * No existing token uses precedence 11, so there is no conflict.
 */
const INFIX_CALL_PREC = 11;

/**
 * Tokens that can legally start an infix argument.
 * Mirrors `isNoParenArgStart` but adds kGue and excludes kSub/kAdd/kNot
 * (unary minus/plus is syntactically ambiguous in infix position).
 */
function isInfixArgStart(token: TokenValue): boolean {
  switch (token) {
    case TokenValue.kString:
    case TokenValue.kTemplateHead:
    case TokenValue.kNumber:
    case TokenValue.kBenarLiteral:
    case TokenValue.kSalahLiteral:
    case TokenValue.kKosongLiteral:
    case TokenValue.kIdentifier:
    case TokenValue.kLeftParen: // allows: x method (a + b)
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
    const nameToken = this.next();

    if (nameToken !== TokenValue.kIdentifier) {
      this.reportUnexpectedToken(nameToken);
      return undefined;
    }

    const firstName = this.currentLiteral();

    // Extension: aksi ReceiverType.methodName ...
    if (this.check(TokenValue.kPeriod)) {
      return this.parseExtensionFunctionDeclaration(firstName, position);
    }

    const variable = this.factory.newVariable(
      firstName,
      VariableMode.kFunction
    );

    const parameters = this.parseParameterList();
    if (isUndefined(parameters)) {
      return undefined;
    }

    const body = this.parseFunctionBody();
    if (!body) return undefined;

    return this.factory.newFunctionDeclaration(
      variable,
      parameters,
      body,
      position
    );
  }

  private parseExtensionFunctionDeclaration(
    receiverName: string,
    position: number
  ): Statement | undefined {
    const methodToken = this.next();
    if (methodToken !== TokenValue.kIdentifier) {
      this.reportUnexpectedToken(methodToken);
      return undefined;
    }
    const methodName = this.currentLiteral();

    const parameters = this.parseParameterList();
    if (isUndefined(parameters)) {
      return undefined;
    }

    // Push synthetic class context so `gue` is valid in the body
    this.classContextStack.push({ className: receiverName, position });
    let body: Block | undefined;
    try {
      body = this.parseFunctionBody();
    } finally {
      this.classContextStack.pop();
    }

    if (!body) return undefined;

    return this.factory.newExtensionFunctionDeclaration(
      receiverName,
      methodName,
      parameters,
      body,
      position
    );
  }

  private parseParameterList(): Parameter[] | undefined {
    if (!this.check(TokenValue.kLeftParen)) {
      return [];
    }

    const parameters: Parameter[] = [];
    let seenDefault = false;

    do {
      const peek = this.peek();
      if (peek !== TokenValue.kIdentifier && peek !== TokenValue.kGue) {
        break;
      }

      this.next();
      const name = this.currentLiteral();
      const variable = this.factory.newVariable(name, VariableMode.kVar);

      let defaultValue: Expression | undefined;

      if (this.check(TokenValue.kAssign)) {
        seenDefault = true;
        defaultValue = this.parseExpression();
        if (!defaultValue) return undefined;
      } else if (seenDefault) {
        this.reportError(MessageTemplate.kNonDefaultAfterDefault, name);
        return undefined;
      }

      parameters.push(this.factory.newParameter(variable, defaultValue));
    } while (this.check(TokenValue.kComma));

    this.expect(TokenValue.kRightParen);
    return parameters;
  }

  /**
   * Parse a function body.
   */
  private parseFunctionBody(): Block | undefined {
    return this.parseBlock();
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

      const fn = this.parseFunctionDeclaration();
      if (!fn || !fn.isFunctionDeclaration()) {
        return undefined;
      }

      const method = {
        name: fn.variable()!.name,
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
    return this.parseAssignmentExpression();
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

    let prec1 = Token.precedence(this.peek(), this.accept_IN);

    if (this.isNoParenArgStartOrInfixCall(expression)) {
      prec1 = INFIX_CALL_PREC;
    }

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

          expr = this.factory.newSubscript(expr, indexProperty, position);
          this.expect(TokenValue.kRightBracket);
          break;
        }

        // Arguments
        case TokenValue.kLeftParen: {
          this.next();

          const position = this.position();
          const arguments_: CallArgument[] = [];
          const closingToken = TokenValue.kRightParen;

          let seenNamed: boolean = false;

          while (this.peek() !== closingToken) {
            // Detect named argument: `identifier =`
            let argName: string | undefined;
            let namePos: number | undefined;

            if (
              this.peek() === TokenValue.kIdentifier &&
              this.scanner.peekAhead() === TokenValue.kAssign
            ) {
              this.next();
              namePos = this.position();
              argName = this.currentLiteral();
              this.next();
              seenNamed = true;
            } else if (seenNamed) {
              // Positional after named
              this.reportErrorAt(
                this.scanner.peekLocation(),
                MessageTemplate.kPositionalAfterNamed
              );
              return undefined;
            }

            const expression = this.parseExpression();

            if (!expression) {
              break;
            }

            arguments_.push(
              this.factory.newCallArgument(expression, argName, namePos)
            );

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
      if (this.peek() === TokenValue.kArrow) {
        const variable = this.factory.newVariable(
          this.currentLiteral(),
          VariableMode.kVar
        );
        return this.parseFunctionLiteralBody([variable], position, true);
      }
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
      case TokenValue.kLeftParen:
        return this.parseParenOrArrowFunctionLiteral();
      case TokenValue.kLeftBracket:
        return this.parseList();
      case TokenValue.kGue: {
        const context = this.currentClassContext;
        this.next();

        if (isUndefined(context)) {
          // `gue` used outside of class
          this.reportError(MessageTemplate.kGueOutsideClass);
          return undefined;
        }

        return this.factory.newVariableExpression(
          this.currentLiteral(),
          this.position()
        );
      }
      // FuncionLiteral :
      //    'ambil' Identifier ':' Expression
      case TokenValue.kAmbil: {
        this.next();
        const position = this.position();
        const params: Variable[] = [];

        do {
          if (this.peek() !== TokenValue.kIdentifier) {
            this.reportUnexpectedTokenAt(
              this.scanner.peekLocation(),
              this.peek()
            );
            return undefined;
          }
          this.next();
          params.push(
            this.factory.newVariable(this.currentLiteral(), VariableMode.kVar)
          );
        } while (this.check(TokenValue.kComma));

        return this.parseFunctionLiteralBody(params, position, false);
      }
      case TokenValue.kTemplateHead:
        return this.parseTemplateLiteral(position);
      default:
        break;
    }

    this.reportUnexpectedToken(this.next());
    return undefined;
  }

  private parseParenOrArrowFunctionLiteral(): Expression | undefined {
    this.next();
    const position = this.position();

    if (this.peek() === TokenValue.kRightParen) {
      this.next();
      if (this.peek() === TokenValue.kArrow) {
        return this.parseFunctionLiteralBody([], position, true);
      }
      return this.factory.newEmptyParentheses(position);
    }

    const firstExpr = this.parseExpression();
    if (!firstExpr) {
      return undefined;
    }

    const params = this.tryParseFunctionParamsFromFirstExpression(firstExpr);

    this.expect(TokenValue.kRightParen);

    if (this.peek() === TokenValue.kArrow) {
      return this.parseFunctionLiteralBody(params, position, true);
    }

    return firstExpr;
  }

  private tryParseFunctionParamsFromFirstExpression(
    firstExpression: Expression
  ): Variable[] {
    if (!firstExpression.isVariableExpression()) {
      return [];
    }

    if (
      this.peek() !== TokenValue.kComma &&
      this.peek() !== TokenValue.kRightParen
    ) {
      return [];
    }

    const params: Variable[] = [
      this.factory.newVariable(firstExpression.name, VariableMode.kVar),
    ];

    while (this.check(TokenValue.kComma)) {
      if (this.peek() !== TokenValue.kIdentifier) {
        this.reportUnexpectedToken(this.peek());
        return [];
      }

      this.next();
      params.push(
        this.factory.newVariable(this.currentLiteral(), VariableMode.kVar)
      );
    }

    return params;
  }

  private parseFunctionLiteralBody(
    params: readonly Variable[],
    position: number,
    allowBlockBody: boolean
  ): Expression | undefined {
    const delimiter = this.next();
    if (delimiter !== TokenValue.kArrow && delimiter !== TokenValue.kColon) {
      this.reportUnexpectedToken(delimiter);
      return undefined;
    }

    if (allowBlockBody && this.peek() === TokenValue.kLeftBrace) {
      const block = this.parseBlock();
      if (!block) {
        return undefined;
      }
      return this.factory.newFunctionLiteral(params, block, position);
    }

    const expression = this.parseAssignmentExpression();
    if (!expression) {
      return expression;
    }

    const returnStatement = this.factory.newReturnStatement(
      expression,
      expression.position
    );
    const body = this.factory.newBlock();
    body.initializeStatements([returnStatement]);
    return this.factory.newFunctionLiteral(params, body, position);
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

  private parseTemplateLiteral(position: number): Expression | undefined {
    this.next();
    const quasis: string[] = [this.currentLiteral()];
    const expressions: Expression[] = [];

    while (true) {
      const exprPos = this.peekPosition();
      const expression = this.parseExpression();
      if (!expression) return undefined;
      expressions.push(expression);

      this.scanner.prepareTemplateContinuation();
      if (this.next() !== TokenValue.kRightBrace) {
        this.reportErrorAt(
          makeLocation(exprPos, this.position()),
          MessageTemplate.kUnterminatedTemplate
        );
        return undefined;
      }

      const chunkToken = this.next();
      quasis.push(this.currentLiteral());

      if (chunkToken === TokenValue.kTemplateTail) {
        break;
      }

      if (chunkToken !== TokenValue.kTemplateMiddle) {
        this.reportUnexpectedToken(chunkToken);
        return undefined;
      }
    }

    return this.factory.newTemplateLiteral(quasis, expressions, position);
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

      // infix function calls at INFIX_CALL_PREC
      if (prec1 === INFIX_CALL_PREC && prec <= INFIX_CALL_PREC) {
        expression = this.parseInfixCallOrNoParenArg(expression);
      }

      --prec1;
    } while (prec1 >= prec);

    return expression;
  }

  private parseInfixCallOrNoParenArg(expression: Expression): Expression {
    if (this.checkInfixCall()) return this.parseInfixCalls(expression);

    // No-paren single-argument call: `ident arg`
    // Conditions:
    //   1. The parsed expression is a plain identifier (VariableExpression)
    //   2. There is no line terminator between the identifier and the next token
    //   3. The next token is a clear argument start (not a binary operator)
    // Valid examples:   spil 'halo'  |  spil hasil  |  spil (x + 1)
    // Invalid examples: spil 'halo', 'dunia'
    if (!this.checkNoParenArg(expression)) return expression;
    const argumentPosition = this.peekPosition();
    const argument = this.parseBinaryExpression(INFIX_CALL_PREC + 1);
    if (!argument) return expression;
    return this.factory.newCall(
      expression,
      [this.factory.newCallArgument(argument, undefined, undefined)],
      argumentPosition
    );
  }

  private parseInfixCalls(initial: Expression): Expression {
    let result = initial;

    while (this.checkInfixCall()) {
      const pos = this.peekPosition();
      this.next();
      const methodName = this.currentLiteral();

      // Argument: arithmetic and above
      // no infix inside infix, no comparisons
      const arg = this.parseBinaryExpression(INFIX_CALL_PREC + 1);
      if (!arg) return result;

      // Desugar: `result methodName arg`  ->  `result.methodName(arg)`
      const methodLiteral = this.factory.newStringLiteral(methodName, pos);
      const property = this.factory.newProperty(result, methodLiteral, pos);
      result = this.factory.newCall(
        property,
        [this.factory.newCallArgument(arg, undefined, undefined)],
        pos
      );
    }

    return result;
  }

  /**
   * Check if the current token is the beginning of an Infix Call.
   */
  private checkInfixCall(): boolean {
    return (
      this.peek() === TokenValue.kIdentifier &&
      !this.scanner.hasLineTerminator() &&
      (isInfixArgStart(this.scanner.peekAhead()) ||
        (this.scanner.peekAhead() === TokenValue.kGue &&
          !isUndefined(this.currentClassContext)))
    );
  }

  /**
   * Check if the current expression and token is no paren arg call
   */
  private checkNoParenArg(expression: Expression): boolean {
    return (
      expression.isVariableExpression() &&
      !this.scanner.hasLineTerminator() &&
      isNoParenArgStart(this.peek())
    );
  }

  private isNoParenArgStartOrInfixCall(expression: Expression): boolean {
    return this.checkNoParenArg(expression) || this.checkInfixCall();
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
