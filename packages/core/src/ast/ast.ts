// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

/**
 * Abstract Syntax Tree (AST) node definitions and utilities for the Santai language.
 *
 * This module provides the core AST node classes and types used to represent the structure
 * of Santai language programs. It includes:
 * - Node type enumeration for all AST node kinds
 * - Abstract base classes for nodes, statements, and expressions
 * - Concrete implementations of specific node types (declarations, literals, operators, etc.)
 * - A factory class for creating AST nodes
 * - A visitor pattern interface for AST traversal
 */

import { TokenValue } from "../parsing/token";
import { assert, assertDefined } from "../base/asserts";
import { isUndefined } from "../base/types";
import { Variable, VariableMode } from "./variable";

export const enum NodeType {
  // Declarations
  kVariableDeclaration,
  kFunctionDeclaration,
  kClassDeclaration,
  kExtensionFunctionDeclaration,
  // Statements
  kForInStatement,
  kWhileStatement,
  kBlock,
  kIfStatement,
  kContinueStatement,
  kBreakStatement,
  kReturnStatement,
  kEmptyStatement,
  kDeclarationList,
  kTryStatement,
  kThrowStatement,
  kImpoortStatement,
  kFromImpoortStatement,
  // Expressions
  kAssignment,
  kListLiteral,
  kBinaryOp,
  kCall,
  kLiteral,
  kUnaryOp,
  kVariableExpression,
  kProperty,
  kFunctionLiteral,
  kEmptyParentheses,
  kTemplateLiteral,
  kConditionalExpression,
}

export abstract class AstNode {
  constructor(
    readonly nodeType: NodeType,
    private readonly _position: number
  ) {}

  get position(): number {
    return this._position;
  }

  isVariableDeclaration(): this is VariableDeclaration {
    return this.nodeType === NodeType.kVariableDeclaration;
  }
  isFunctionDeclaration(): this is FunctionDeclaration {
    return this.nodeType === NodeType.kFunctionDeclaration;
  }
  isClassDeclaration(): this is ClassDeclaration {
    return this.nodeType === NodeType.kClassDeclaration;
  }
  isExtensionFunctionDeclaration(): this is ExtensionFunctionDeclaration {
    return this.nodeType === NodeType.kExtensionFunctionDeclaration;
  }
  isForInStatement(): this is ForInStatement {
    return this.nodeType === NodeType.kForInStatement;
  }
  isWhileStatement(): this is WhileStatement {
    return this.nodeType === NodeType.kWhileStatement;
  }
  isBlock(): this is Block {
    return this.nodeType === NodeType.kBlock;
  }
  isReturnStatement(): this is ReturnStatement {
    return this.nodeType === NodeType.kReturnStatement;
  }
  isBreakStatement(): this is BreakStatement {
    return this.nodeType === NodeType.kBreakStatement;
  }
  isContinueStatement(): this is ContinueStatement {
    return this.nodeType === NodeType.kContinueStatement;
  }
  isEmptyStatement(): this is EmptyStatement {
    return this.nodeType === NodeType.kEmptyStatement;
  }
  isIfStatement(): this is IfStatement {
    return this.nodeType === NodeType.kIfStatement;
  }
  isTryStatement(): this is TryStatement {
    return this.nodeType === NodeType.kTryStatement;
  }
  isThrowStatement(): this is ThrowStatement {
    return this.nodeType === NodeType.kThrowStatement;
  }
  isImportStatement(): this is ImportStatement {
    return this.nodeType === NodeType.kImpoortStatement;
  }
  isFromImpoortStatement(): this is FromImpoortStatement {
    return this.nodeType === NodeType.kFromImpoortStatement;
  }
  isDeclarationList(): this is DeclarationList {
    return this.nodeType === NodeType.kDeclarationList;
  }
  isAssignment(): this is Assignment {
    return this.nodeType === NodeType.kAssignment;
  }
  isListLiteral(): this is ListLiteral {
    return this.nodeType === NodeType.kListLiteral;
  }
  isBinaryOp(): this is BinaryOp {
    return this.nodeType === NodeType.kBinaryOp;
  }
  isCall(): this is Call {
    return this.nodeType === NodeType.kCall;
  }
  isLiteral(): this is Literal {
    return this.nodeType === NodeType.kLiteral;
  }
  isUnaryOp(): this is UnaryOp {
    return this.nodeType === NodeType.kUnaryOp;
  }
  isVariableExpression(): this is VariableExpression {
    return this.nodeType === NodeType.kVariableExpression;
  }
  isProperty(): this is Property {
    return this.nodeType === NodeType.kProperty;
  }
  isFunctionLiteral(): this is FunctionLiteral {
    return this.nodeType === NodeType.kFunctionLiteral;
  }
  isEmptyParentheses(): this is EmptyParentheses {
    return this.nodeType === NodeType.kEmptyParentheses;
  }
  isTemplateLiteral(): this is TemplateLiteral {
    return this.nodeType === NodeType.kTemplateLiteral;
  }
  isConditionalExpression(): this is ConditionalExpression {
    return this.nodeType === NodeType.kConditionalExpression;
  }
}

export abstract class Statement extends AstNode {}

export abstract class Expression extends AstNode {}

export const enum LiteralType {
  kString,
  kNumber,
  kBoolean,
  kKosong,
}

export class Literal extends Expression {
  private constructor(
    readonly type: LiteralType,
    position: number,
    private readonly stringVal?: string,
    private readonly numberVal?: number,
    private readonly boolVal?: boolean
  ) {
    super(NodeType.kLiteral, position);
  }

  static empty(position: number): Literal {
    return new Literal(LiteralType.kKosong, position);
  }

  static number(value: number, position: number): Literal {
    return new Literal(LiteralType.kNumber, position, undefined, value);
  }

  static string(value: string, position: number): Literal {
    return new Literal(LiteralType.kString, position, value);
  }

  static boolean(value: boolean, position: number): Literal {
    return new Literal(
      LiteralType.kBoolean,
      position,
      undefined,
      undefined,
      value
    );
  }

  isNumberLiteral(): boolean {
    return this.type === LiteralType.kNumber;
  }
  asNumber(): number {
    assert(this.isNumberLiteral());
    return this.numberVal!;
  }

  isStringLiteral(): boolean {
    return this.type === LiteralType.kString;
  }
  asStringLiteral(): string {
    assert(this.type === LiteralType.kString);
    return this.stringVal!;
  }

  isBooleanLiteral(): boolean {
    return this.type === LiteralType.kBoolean;
  }
  asBooleanLiteral(): boolean {
    assert(this.type === LiteralType.kBoolean);
    return this.boolVal!;
  }

  toBooleanIsTrue(): boolean {
    switch (this.type) {
      case LiteralType.kNumber:
        return this.asNumber() !== 0;
      case LiteralType.kString:
        return this.stringVal !== "";
      case LiteralType.kBoolean:
        return this.boolVal!;
      case LiteralType.kKosong:
        return false;
    }
  }

  toBooleanIsFalse(): boolean {
    return !this.toBooleanIsTrue();
  }

  isKosongLiteral(): boolean {
    return this.type === LiteralType.kKosong;
  }
}

export class Block extends Statement {
  private _statements: Statement[] = [];

  constructor() {
    super(NodeType.kBlock, -1);
  }

  statements(): readonly Statement[] {
    return this._statements;
  }

  initializeStatements(statements: Statement[]): void {
    this._statements = statements;
  }
}

export class VariableExpression extends Expression {
  constructor(
    readonly name: string,
    position: number
  ) {
    super(NodeType.kVariableExpression, position);
  }
}

export abstract class Declaration extends Statement {
  private _variable: Variable | undefined = undefined;

  variable(): Variable | undefined {
    return this._variable;
  }
  setVariable(variable: Variable | undefined): void {
    this._variable = variable;
  }
}

export class DeclarationList extends Statement {
  constructor(
    readonly declarations: Declaration[],
    position: number
  ) {
    super(NodeType.kDeclarationList, position);
  }
}

export class VariableDeclaration extends Declaration {
  private _initializer: Expression | undefined = undefined;

  constructor(position: number) {
    super(NodeType.kVariableDeclaration, position);
  }

  initializer(): Expression | undefined {
    return this._initializer;
  }

  initialize(targetVar: Variable, init: Expression | undefined): void {
    this.setVariable(targetVar);
    this._initializer = init;
  }
}

export class Parameter {
  constructor(
    readonly variable: Variable,
    readonly defaultValue: Expression | undefined
  ) {}

  get name(): string {
    return this.variable.name;
  }

  hasDefault(): boolean {
    return !isUndefined(this.defaultValue);
  }
}

export class FunctionDeclaration extends Declaration {
  constructor(
    readonly params: Parameter[],
    readonly body: Block,
    position: number
  ) {
    super(NodeType.kFunctionDeclaration, position);
  }
}

/**
 * One method in the class.
 * Not a separate AstNode. Stored directly in {@link ClassDeclaration}
 */
export interface ClassMethod {
  readonly name: string;
  readonly params: readonly Parameter[];
  readonly body: Block;
  readonly position: number;
}

export class ClassDeclaration extends Declaration {
  constructor(
    readonly className: string,
    readonly methods: readonly ClassMethod[],
    position: number
  ) {
    super(NodeType.kClassDeclaration, position);
  }
}

export class ExtensionFunctionDeclaration extends Statement {
  constructor(
    /**
     * Receiver type name as written in source
     */
    readonly receiverName: string,

    /**
     * The new method name being added.
     */
    readonly methodName: string,

    readonly params: readonly Parameter[],
    readonly body: Block,
    position: number
  ) {
    super(NodeType.kExtensionFunctionDeclaration, position);
  }
}

export class Property extends Expression {
  constructor(
    readonly object: Expression,
    readonly property: Expression,
    readonly isComputed: boolean,
    position: number
  ) {
    super(NodeType.kProperty, position);
  }
}

export class FunctionLiteral extends Expression {
  constructor(
    readonly params: readonly Variable[],
    readonly body: Block,
    position: number
  ) {
    super(NodeType.kFunctionLiteral, position);
  }
}

export class EmptyParentheses extends Expression {
  constructor(position: number) {
    super(NodeType.kEmptyParentheses, position);
  }
}

export class TemplateLiteral extends Expression {
  constructor(
    readonly quasis: readonly string[],
    readonly expressions: readonly Expression[],
    position: number
  ) {
    super(NodeType.kTemplateLiteral, position);
  }
}

export abstract class IterationStatement extends Statement {
  constructor(
    nodeType: NodeType,
    position: number,
    readonly body: Statement
  ) {
    super(nodeType, position);
  }
}

export class ForInStatement extends IterationStatement {
  constructor(
    readonly variable: Variable,
    readonly iterable: Expression,
    body: Statement,
    position: number
  ) {
    super(NodeType.kForInStatement, position, body);
  }
}

export class WhileStatement extends IterationStatement {
  constructor(
    readonly condition: Expression,
    body: Statement,
    position: number
  ) {
    super(NodeType.kWhileStatement, position, body);
  }
}

export class ReturnStatement extends Statement {
  constructor(
    readonly expression: Expression | undefined,
    position: number
  ) {
    super(NodeType.kReturnStatement, position);
  }
}

export class Assignment extends Expression {
  constructor(
    readonly target: Expression,
    readonly value: Expression,
    position: number
  ) {
    super(NodeType.kAssignment, position);
  }
}

export class ListLiteral extends Expression {
  constructor(
    readonly values: Expression[],
    position: number
  ) {
    super(NodeType.kListLiteral, position);
  }
}

export class BreakStatement extends Statement {
  constructor() {
    super(NodeType.kBreakStatement, -1);
  }
}

export class ContinueStatement extends Statement {
  constructor() {
    super(NodeType.kContinueStatement, -1);
  }
}

export class EmptyStatement extends Statement {
  constructor() {
    super(NodeType.kEmptyStatement, -1);
  }
}

export class IfStatement extends Statement {
  constructor(
    readonly condition: Expression,
    readonly then: Statement,
    readonly orelse: Statement,
    position: number
  ) {
    super(NodeType.kIfStatement, position);
  }

  hasElseStatement(): boolean {
    return !this.orelse.isEmptyStatement();
  }
}

export class TryStatement extends Statement {
  constructor(
    readonly body: Statement,
    readonly catchVariable: Variable | undefined,
    readonly catchBody: Statement | undefined,
    readonly finallyBody: Statement | undefined,
    position: number
  ) {
    super(NodeType.kTryStatement, position);
  }

  hasCatch(): boolean {
    return !isUndefined(this.catchBody);
  }

  hasFinally(): boolean {
    return !isUndefined(this.catchBody);
  }
}

export class ThrowStatement extends Statement {
  constructor(
    readonly expression: Expression,
    position: number
  ) {
    super(NodeType.kThrowStatement, position);
  }
}

export interface ImportSpecifier {
  readonly name: string;
  readonly alias: string | undefined;
  readonly namePos: number;
}

export interface ModulePath {
  readonly level: number;
  readonly parts: readonly string[];
}

export class ImportStatement extends Statement {
  constructor(
    readonly modulePath: ModulePath,
    readonly alias: string | undefined,
    position: number
  ) {
    super(NodeType.kImpoortStatement, position);
  }

  getLocalName(): string {
    if (!isUndefined(this.alias)) {
      return this.alias;
    }
    const { parts } = this.modulePath;
    const name: string = parts[parts.length - 1];
    assertDefined(name);
    return name;
  }
}

export class FromImpoortStatement extends Statement {
  constructor(
    readonly modulePath: ModulePath,
    readonly specifiers: readonly ImportSpecifier[],
    readonly star: boolean,
    position: number
  ) {
    super(NodeType.kFromImpoortStatement, position);
  }
}

export class BinaryOp extends Expression {
  constructor(
    readonly op: TokenValue,
    readonly left: Expression,
    readonly right: Expression,
    pos: number
  ) {
    super(NodeType.kBinaryOp, pos);
  }
}

export class UnaryOp extends Expression {
  constructor(
    readonly op: TokenValue,
    readonly expression: Expression,
    pos: number
  ) {
    super(NodeType.kUnaryOp, pos);
  }
}

export class CallArgument {
  constructor(
    readonly value: Expression,
    readonly name: string | undefined,
    readonly namePos: number | undefined
  ) {}

  isNamed(): boolean {
    return !isUndefined(this.name);
  }
}

export class Call extends Expression {
  constructor(
    readonly expression: Expression,
    private readonly _arguments: CallArgument[],
    position: number
  ) {
    super(NodeType.kCall, position);
  }

  arguments(): CallArgument[] {
    return this._arguments;
  }
}

export class ConditionalExpression extends Expression {
  constructor(
    readonly consequent: Expression,
    readonly condition: Expression,
    readonly alternative: Expression,
    position: number
  ) {
    super(NodeType.kConditionalExpression, position);
  }
}

/**
 * Factory class for creating AST nodes.
 */
export class AstNodeFactory {
  private readonly _emptyStatement = new EmptyStatement();
  emptyStatement(): EmptyStatement {
    return this._emptyStatement;
  }

  newDeclarationList(
    declarations: Declaration[],
    position: number
  ): DeclarationList {
    return new DeclarationList(declarations, position);
  }

  newVariableDeclaration(
    variable: Variable,
    init: Expression | undefined,
    position: number
  ): VariableDeclaration {
    const declaration = new VariableDeclaration(position);
    declaration.initialize(variable, init);
    return declaration;
  }

  newVariableExpression(name: string, position: number): VariableExpression {
    return new VariableExpression(name, position);
  }

  newParameter(
    variable: Variable,
    defaultValue: Expression | undefined
  ): Parameter {
    return new Parameter(variable, defaultValue);
  }

  newFunctionDeclaration(
    variable: Variable,
    params: Parameter[],
    body: Block,
    position: number
  ): FunctionDeclaration {
    const declaration = new FunctionDeclaration(params, body, position);
    declaration.setVariable(variable);
    return declaration;
  }

  newClassDeclaration(
    className: string,
    methods: readonly ClassMethod[],
    position: number
  ): ClassDeclaration {
    const variable = new Variable(className, VariableMode.kVar);
    const declaration = new ClassDeclaration(className, methods, position);
    declaration.setVariable(variable);
    return declaration;
  }

  newExtensionFunctionDeclaration(
    receiverName: string,
    methodName: string,
    params: readonly Parameter[],
    body: Block,
    position: number
  ): ExtensionFunctionDeclaration {
    return new ExtensionFunctionDeclaration(
      receiverName,
      methodName,
      params,
      body,
      position
    );
  }

  newProperty(
    object: Expression,
    property: Expression,
    position: number
  ): Property {
    return new Property(object, property, false, position);
  }

  newSubscript(
    object: Expression,
    property: Expression,
    position: number
  ): Property {
    return new Property(object, property, true, position);
  }

  newFunctionLiteral(
    params: readonly Variable[],
    body: Block,
    position: number
  ): FunctionLiteral {
    return new FunctionLiteral(params, body, position);
  }

  newEmptyParentheses(position: number): EmptyParentheses {
    return new EmptyParentheses(position);
  }

  newTemplateLiteral(
    quasis: string[],
    expressions: Expression[],
    position: number
  ): TemplateLiteral {
    return new TemplateLiteral(quasis, expressions, position);
  }

  newReturnStatement(
    expression: Expression | undefined,
    position: number
  ): ReturnStatement {
    return new ReturnStatement(expression, position);
  }

  newBreakStatement(): BreakStatement {
    return new BreakStatement();
  }

  newContinueStatement(): ContinueStatement {
    return new ContinueStatement();
  }

  newBlock(): Block {
    return new Block();
  }

  newForInStatement(
    variable: Variable,
    iterable: Expression,
    body: Statement,
    position: number
  ): ForInStatement {
    return new ForInStatement(variable, iterable, body, position);
  }

  newWhileStatement(
    condition: Expression,
    body: Statement,
    position: number
  ): WhileStatement {
    return new WhileStatement(condition, body, position);
  }

  newIfStatement(
    condition: Expression,
    thenBranch: Statement,
    elseBranch: Statement,
    position: number
  ): IfStatement {
    return new IfStatement(condition, thenBranch, elseBranch, position);
  }

  newTryStatement(
    body: Statement,
    catchVariable: Variable | undefined,
    catchBody: Statement | undefined,
    finallyBody: Statement | undefined,
    position: number
  ): TryStatement {
    return new TryStatement(
      body,
      catchVariable,
      catchBody,
      finallyBody,
      position
    );
  }

  newThrowStatement(expression: Expression, position: number): ThrowStatement {
    return new ThrowStatement(expression, position);
  }

  newImportStatement(
    modulePath: ModulePath,
    alias: string | undefined,
    position: number
  ): ImportStatement {
    return new ImportStatement(modulePath, alias, position);
  }

  newFromImportStatement(
    modulePath: ModulePath,
    specifiers: readonly ImportSpecifier[],
    star: boolean,
    position: number
  ): FromImpoortStatement {
    return new FromImpoortStatement(modulePath, specifiers, star, position);
  }

  newAssignment(
    target: Expression,
    value: Expression,
    position: number
  ): Assignment {
    return new Assignment(target, value, position);
  }

  newListLiteral(values: Expression[], position: number): ListLiteral {
    return new ListLiteral(values, position);
  }

  newBinaryOp(
    op: TokenValue,
    left: Expression,
    right: Expression,
    pos: number
  ): BinaryOp {
    return new BinaryOp(op, left, right, pos);
  }

  newUnaryOp(op: TokenValue, expr: Expression, pos: number): UnaryOp {
    return new UnaryOp(op, expr, pos);
  }

  newCallArgument(
    value: Expression,
    name: string | undefined,
    namePos: number | undefined
  ): CallArgument {
    return new CallArgument(value, name, namePos);
  }

  newCall(
    expression: Expression,
    arguments_: CallArgument[],
    position: number
  ): Call {
    return new Call(expression, arguments_, position);
  }

  newConditionalExpression(
    consequent: Expression,
    condition: Expression,
    alternative: Expression,
    position: number
  ): ConditionalExpression {
    return new ConditionalExpression(
      consequent,
      condition,
      alternative,
      position
    );
  }

  newVariable(name: string, mode: VariableMode): Variable {
    return new Variable(name, mode);
  }

  newEmptyLiteral(position: number): Literal {
    return Literal.empty(position);
  }
  newStringLiteral(value: string, position: number): Literal {
    return Literal.string(value, position);
  }
  newNumberLiteral(value: number, position: number): Literal {
    return Literal.number(value, position);
  }
  newBooleanLiteral(value: boolean, position: number): Literal {
    return Literal.boolean(value, position);
  }
}

/**
 * Abstract visitor class for traversing and operating on AST nodes.
 * Implements the visitor pattern for generic AST processing.
 *
 * @abstract
 * @template R - Return type of visit methods
 */
export abstract class AstVisitor<R = void> {
  abstract visit(node: AstNode): R;
  abstract visitVariableDeclaration(node: VariableDeclaration): R;
  abstract visitFunctionDeclaration(node: FunctionDeclaration): R;
  abstract visitClassDeclaration(node: ClassDeclaration): R;
  abstract visitExtensionFunctionDeclaration(
    node: ExtensionFunctionDeclaration
  ): R;
  abstract visitProperty(node: Property): R;
  abstract visitFunctionLiteral(node: FunctionLiteral): R;
  abstract visitEmptyParentheses(node: EmptyParentheses): R;
  abstract visitTemplateLiteral(node: TemplateLiteral): R;
  abstract visitForInStatement(node: ForInStatement): R;
  abstract visitWhileStatement(node: WhileStatement): R;
  abstract visitBlock(node: Block): R;
  abstract visitReturnStatement(node: ReturnStatement): R;
  abstract visitBreakStatement(node: BreakStatement): R;
  abstract visitContinueStatement(node: ContinueStatement): R;
  abstract visitEmptyStatement(node: EmptyStatement): R;
  abstract visitIfStatement(node: IfStatement): R;
  abstract visitTryStatement(node: TryStatement): R;
  abstract visitThrowStatement(node: ThrowStatement): R;
  abstract visitImportStatement(node: ImportStatement): R;
  abstract visitFromImportStatement(node: FromImpoortStatement): R;
  abstract visitDeclarationList(node: DeclarationList): R;
  abstract visitAssignment(node: Assignment): R;
  abstract visitListLiteral(node: ListLiteral): R;
  abstract visitBinaryOp(node: BinaryOp): R;
  abstract visitCall(node: Call): R;
  abstract visitConditionalExpression(node: ConditionalExpression): R;
  abstract visitLiteral(node: Literal): R;
  abstract visitUnaryOp(node: UnaryOp): R;
  abstract visitVariableExpression(node: VariableExpression): R;
}
