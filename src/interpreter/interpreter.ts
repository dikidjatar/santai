// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert, assertDefined, unreachable } from "../base/asserts";
import {
  Assignment,
  AstNode,
  AstVisitor,
  BinaryOp,
  Block,
  BreakStatement,
  Call,
  ClassDeclaration,
  ContinueStatement,
  DeclarationList,
  EmptyStatement,
  Expression,
  ForInStatement,
  FunctionDeclaration,
  IfStatement,
  ListLiteral,
  Literal,
  LiteralType,
  Property,
  ReturnStatement,
  Statement,
  ThisExpression,
  UnaryOp,
  VariableDeclaration,
  VariableExpression,
  WhileStatement,
} from "../base/ast";
import { ErrorHandler, StackFrame } from "../base/errorHandler";
import { MessageTemplate } from "../base/messageTemplate";
import { isNumber, isObject, isUndefined, Signal } from "../base/types";
import { Variable, VariableMode } from "../base/variable";
import { BuiltinCallable, BuiltinRegistry } from "../builtins/builtin";
import "../builtins/globals";
import { SantaiIterator } from "../objects/iterator";
import {
  isOperationError,
  OperationResult,
  SantaiBoolean,
  SantaiClass,
  SantaiFunction,
  SantaiInstance,
  santaiKosong,
  SantaiList,
  SantaiNumber,
  SantaiObject,
  SantaiString,
} from "../objects/object";
import { makeLocation, ScannerLocation } from "../parsing/scanner";
import { Token, TokenValue } from "../parsing/token";
import { Environment, VariableSlot } from "./environment";

/**
 * The implicit slot name in the Environment for the receiver (`gue`).
 * Declared by `callFunction` when the class method is called.
 *
 * The parser already guarantees that `ThisExpression` only appears inside
 * class method — so that `visitThisExpression` can be looked up directly
 * without needing to check context. `GUE_SLOT` is still needed because of the interpreter
 * which places the value in the environment, not the parser.
 */
const GUE_SLOT = "__gue__" as const;

class ReturnSignal extends Signal<ReturnStatement> {
  constructor(
    node: ReturnStatement,
    readonly value: SantaiObject
  ) {
    super(node);
  }
}

class BreakSignal extends Signal<BreakStatement> {}
class ContinueSignal extends Signal<ContinueStatement> {}

function isReturnSignal(signal: unknown): signal is ReturnSignal {
  return signal instanceof ReturnSignal;
}

function isBreakSignal(signal: unknown): signal is BreakSignal {
  return signal instanceof BreakSignal;
}

function isContinueSignal(signal: unknown): signal is ContinueSignal {
  return signal instanceof ContinueSignal;
}

function getLocationForNode(node: AstNode): ScannerLocation {
  const begin: number = node.position;
  const end = (end: number) => makeLocation(begin, begin + end);

  switch (true) {
    case node.isVariableExpression():
      return end(node.name.length);
    case node.isVariableDeclaration():
      return end(node.variable()!.name.length);
    case node.isFunctionDeclaration():
      return end(node.variable()!.name.length);
    //TODO: Add other node
    default:
      return end(0);
  }
}

export class Interpreter extends AstVisitor<SantaiObject> {
  private readonly globalEnv: Environment;
  private env: Environment;

  /**
   * Call stack for runtime one entry per active user-defined function.
   * Pushed when entering `visitCall`, popped when exiting (in `finally`).
   * Included in `reportErrorWithStack` so diagnostic output has a stack trace.
   */
  private readonly callStack: StackFrame[] = [];

  constructor(private readonly errorHandler: ErrorHandler) {
    super();
    this.globalEnv = new Environment();
    this.env = this.globalEnv;
    this.registerBuiltinsGlobals();
  }

  private registerBuiltinsGlobals(): void {
    const builtins = BuiltinRegistry.getInstance().getAllBuiltins();

    for (const builtin of builtins) {
      const variable: Variable = new Variable(
        builtin.name,
        VariableMode.kConst
      );
      this.globalEnv.declare(variable, builtin);
    }
  }

  execute(program: AstNode): void {
    try {
      this.visit(program);
    } catch (error) {
      if (isReturnSignal(error)) {
        this.report(error.node, MessageTemplate.kIllegalReturnStatement);
      } else if (isBreakSignal(error)) {
        this.report(error.node, MessageTemplate.kIllegalBreakStatement);
      } else if (isContinueSignal(error)) {
        this.report(error.node, MessageTemplate.kIllegalContinueStatement);
      } else {
        throw error;
      }
    }
  }

  evaluate(node: AstNode): SantaiObject {
    return this.visit(node);
  }

  override visit(node: AstNode): SantaiObject {
    assertDefined(node);

    if (this.errorHandler.hasErrors()) {
      return santaiKosong;
    }

    switch (true) {
      case node.isVariableDeclaration():
        return this.visitVariableDeclaration(node);
      case node.isFunctionDeclaration():
        return this.visitFunctionDeclaration(node);
      case node.isClassDeclaration():
        return this.visitClassDeclaration(node);
      case node.isProperty():
        return this.visitProperty(node);
      case node.isThisExpression():
        return this.visitThisExpression(node);
      case node.isForInStatement():
        return this.visitForInStatement(node);
      case node.isWhileStatement():
        return this.visitWhileStatement(node);
      case node.isBlock():
        return this.visitBlock(node);
      case node.isReturnStatement():
        return this.visitReturnStatement(node);
      case node.isBreakStatement():
        return this.visitBreakStatement(node);
      case node.isContinueStatement():
        return this.visitContinueStatement(node);
      case node.isEmptyStatement():
        return this.visitEmptyStatement(node);
      case node.isIfStatement():
        return this.visitIfStatement(node);
      case node.isDeclarationList():
        return this.visitDeclarationList(node);
      case node.isAssignment():
        return this.visitAssignment(node);
      case node.isListLiteral():
        return this.visitListLiteral(node);
      case node.isBinaryOp():
        return this.visitBinaryOp(node);
      case node.isCall():
        return this.visitCall(node);
      case node.isLiteral():
        return this.visitLiteral(node);
      case node.isUnaryOp():
        return this.visitUnaryOp(node);
      case node.isVariableExpression():
        return this.visitVariableExpression(node);
      default:
        unreachable();
    }
  }

  override visitVariableDeclaration(node: VariableDeclaration): SantaiObject {
    const variable: Variable | undefined = node.variable();
    assertDefined(variable);
    let value: SantaiObject = santaiKosong;
    const initializer = node.initializer();

    if (initializer) {
      value = this.evaluate(initializer);
    } else if (variable.isConst()) {
      this.report(node, MessageTemplate.kConstDeclMissingInitialize);
      return santaiKosong;
    }

    if (!this.env.declare(variable, value)) {
      this.report(node, MessageTemplate.kVarRedeclaration, variable.name);
    }

    return santaiKosong;
  }

  override visitFunctionDeclaration(node: FunctionDeclaration): SantaiObject {
    const variable = node.variable();
    assertDefined(variable);
    assert(variable.isFunction());

    const functionObj: SantaiFunction = new SantaiFunction(
      variable.name,
      node.params,
      node.body,
      this.env
    );
    if (!this.env.declare(variable, functionObj)) {
      this.report(node, MessageTemplate.kVarRedeclaration, functionObj.name);
    }

    return santaiKosong;
  }

  override visitForInStatement(node: ForInStatement): SantaiObject {
    const iterable: SantaiObject = this.evaluate(node.iterable);

    // Ensure the object supports iteration before starting the loop
    if (!iterable.isIterable()) {
      this.report(
        node.iterable,
        MessageTemplate.kNotIterable,
        iterable.typeName
      );
      return santaiKosong;
    }

    const iterator: SantaiIterator = iterable.iterate();

    // Special loop environment: iterator variable lives here, separate
    // from outer scope, but can still access outer scope variables.
    const variable = node.variable;
    const body = node.body;
    const loopEnv = Environment.new(this.env);
    const previousEnv = this.env;
    this.env = loopEnv;

    // Declare iteration variable in loop env with initial value kosong.
    // Value will be updated each iteration through loopEnv.update().
    if (!loopEnv.declare(variable, santaiKosong)) {
      this.report(node, MessageTemplate.kVarRedeclaration, variable.name);
      return santaiKosong;
    }

    try {
      while (iterator.hasNext()) {
        const next = iterator.next();

        // Set iteration variable value for this iteration.
        loopEnv.update(variable, next.value);

        try {
          this.evaluate(body);
        } catch (signal) {
          if (isBreakSignal(signal)) {
            break;
          }

          if (isContinueSignal(signal)) {
            continue;
          }

          throw signal;
        }
      }
    } finally {
      this.env = previousEnv;
    }

    return santaiKosong;
  }

  override visitClassDeclaration(node: ClassDeclaration): SantaiObject {
    const variable: Variable | undefined = node.variable();
    assertDefined(variable);

    const methods: SantaiFunction[] = node.methods.map((method) => {
      return new SantaiFunction(
        method.name,
        method.params,
        method.body,
        this.env
      );
    });

    const klass = new SantaiClass(node.className, methods);

    if (!this.env.declare(variable, klass)) {
      this.report(node, MessageTemplate.kVarRedeclaration, node.className);
    }

    return santaiKosong;
  }

  override visitProperty(node: Property): SantaiObject {
    const obj = this.evaluate(node.object);
    const name = this.resolvePropertyName(node);

    const prop = obj.getProperty(name);
    if (!isUndefined(prop)) {
      return prop;
    }

    this.report(node, MessageTemplate.kPropertyNotFound, name, obj.typeName);
    return santaiKosong;
  }

  override visitThisExpression(_node: ThisExpression): SantaiObject {
    const receiver = this.env.get(GUE_SLOT);

    if (receiver !== undefined) {
      return receiver;
    }

    // It should never have gotten here
    // if the parser was working correctly.
    unreachable();
  }

  /**
   * Extracts property names from `Property` as strings.
   */
  private resolvePropertyName(node: Property): string {
    const property = node.property;

    if (property.isLiteral() && property.isStringLiteral()) {
      return property.asStringLiteral();
    }

    return this.evaluate(node).inspect();
  }

  override visitWhileStatement(node: WhileStatement): SantaiObject {
    const conditionExpression: Expression = node.condition;
    assertDefined(conditionExpression);

    while (true) {
      const condition: SantaiObject = this.evaluate(conditionExpression);

      if (!condition.isTruthy()) {
        break;
      }

      try {
        this.evaluate(node.body);
      } catch (signal) {
        if (isBreakSignal(signal)) {
          break;
        }

        if (isContinueSignal(signal)) {
          continue;
        }

        throw signal;
      }
    }

    return santaiKosong;
  }

  override visitBlock(node: Block): SantaiObject {
    const blockEnv = Environment.new(this.env);
    return this.evaluateStatements(node.statements(), blockEnv);
  }

  override visitReturnStatement(node: ReturnStatement): SantaiObject {
    const expression = node.expression;
    const value = expression ? this.evaluate(expression) : santaiKosong;
    throw new ReturnSignal(node, value);
  }

  override visitBreakStatement(node: BreakStatement): SantaiObject {
    throw new BreakSignal(node);
  }

  override visitContinueStatement(node: ContinueStatement): SantaiObject {
    throw new ContinueSignal(node);
  }

  override visitEmptyStatement(_node: EmptyStatement): SantaiObject {
    return santaiKosong;
  }

  override visitIfStatement(node: IfStatement): SantaiObject {
    const condition: SantaiObject = this.evaluate(node.condition);

    if (!condition) {
      return santaiKosong;
    }

    if (condition.isTruthy()) {
      return this.evaluate(node.then);
    } else if (node.hasElseStatement()) {
      return this.evaluate(node.orelse);
    } else {
      return santaiKosong;
    }
  }

  override visitDeclarationList(node: DeclarationList): SantaiObject {
    for (const declaration of node.declarations) {
      assert(declaration.isVariableDeclaration());
      this.visitVariableDeclaration(declaration);
    }

    return santaiKosong;
  }

  override visitAssignment(node: Assignment): SantaiObject {
    const value = this.evaluate(node.value);

    if (!this.assignToTarget(node.target, value)) {
      return santaiKosong;
    }

    return value;
  }

  private assignToTarget(target: Expression, value: SantaiObject): boolean {
    if (target.isVariableExpression()) {
      const variableInfo: VariableSlot | undefined = this.env.findSlot(
        target.name
      );

      if (!variableInfo) {
        this.report(target, MessageTemplate.kNotDefined, target.name);
        return false;
      }

      if (!this.env.update(variableInfo.variable, value)) {
        this.report(
          target,
          MessageTemplate.kAssignToContantVariable,
          variableInfo.variable.name
        );
        return false;
      }

      return true;
    } else if (target.isProperty()) {
      const obj = this.evaluate(target.object);

      if (!obj.isInstance()) {
        this.report(
          target,
          MessageTemplate.kCannotSetProperty,
          this.resolvePropertyName(target),
          obj.typeName
        );
        return false;
      }

      const propName = this.resolvePropertyName(target);
      obj.setProperty(propName, value);
      return true;
    } else {
      this.report(target, MessageTemplate.kInvalidAssignmentTarget);
      return false;
    }
  }

  override visitListLiteral(node: ListLiteral): SantaiObject {
    const elements: SantaiObject[] = [];

    for (const value of node.values) {
      const element: SantaiObject = this.evaluate(value);

      if (!element) {
        return santaiKosong;
      }

      elements.push(element);
    }

    return new SantaiList(elements);
  }

  override visitUnaryOp(node: UnaryOp): SantaiObject {
    const right = this.evaluate(node.expression);
    const op = node.op;

    switch (op) {
      case TokenValue.kNot:
        return SantaiBoolean.of(!right.isTruthy());
      case TokenValue.kSub: {
        if (!right.isNumber()) {
          this.report(
            node,
            MessageTemplate.kUnsupportedUnaryOperation,
            Token.string(op),
            right.typeName
          );
          return santaiKosong;
        }
        return new SantaiNumber(-right.value);
      }
      case TokenValue.kAdd: {
        if (!right.isNumber()) {
          this.report(
            node,
            MessageTemplate.kUnsupportedUnaryOperation,
            Token.string(op),
            right.typeName
          );
          return santaiKosong;
        }
        return right;
      }
      default:
        unreachable();
    }
  }

  override visitBinaryOp(node: BinaryOp): SantaiObject {
    const left: SantaiObject = this.evaluate(node.left);
    const op: TokenValue = node.op;

    if (op === TokenValue.kDan) {
      if (!left.isTruthy()) {
        return SantaiBoolean.FALSE;
      } else {
        const right: SantaiObject = this.evaluate(node.right);
        return SantaiBoolean.of(right.isTruthy());
      }
    }

    if (op === TokenValue.kAtau) {
      if (left.isTruthy()) {
        return SantaiBoolean.TRUE;
      } else {
        const right = this.evaluate(node.right);
        return SantaiBoolean.of(right.isTruthy());
      }
    }

    const right = this.evaluate(node.right);
    return this.evaluateInfixExpression(node.op, left, right, node);
  }

  private evaluateInfixExpression(
    op: TokenValue,
    left: SantaiObject,
    right: SantaiObject,
    node: AstNode
  ): SantaiObject {
    const resolve = (r: OperationResult) => this.resolveOp(r, node);

    switch (op) {
      case TokenValue.kAdd:
        return resolve(left.opAdd(right));
      case TokenValue.kSub:
        return resolve(left.opSub(right));
      case TokenValue.kMul:
        return resolve(left.opMul(right));
      case TokenValue.kDiv:
        return resolve(left.opDiv(right));
      case TokenValue.kMod:
        return resolve(left.opMod(right));
      case TokenValue.kExp:
        return resolve(left.opExp(right));

      case TokenValue.kEq:
        return resolve(left.opEquals(right));
      case TokenValue.kNotEq: {
        const eq = resolve(left.opEquals(right));
        return eq.isBoolean() ? SantaiBoolean.of(!eq.value) : santaiKosong;
      }

      case TokenValue.kLessThan:
        return resolve(left.opLessThan(right));
      case TokenValue.kGreaterThan:
        return resolve(left.opGreaterThan(right));
      case TokenValue.kLessThanEq: {
        // a <= b  =  !(a > b)
        const gt = resolve(left.opGreaterThan(right));
        return gt.isBoolean() ? SantaiBoolean.of(!gt.value) : santaiKosong;
      }
      case TokenValue.kGreaterThanEq: {
        // a >= b  =  !(a < b)
        const lt = resolve(left.opLessThan(right));
        return lt.isBoolean() ? SantaiBoolean.of(!lt.value) : santaiKosong;
      }

      default:
        this.report(
          node,
          MessageTemplate.kUnsupportedBinaryOperation,
          Token.string(op),
          left.typeName,
          right.typeName
        );
        return santaiKosong;
    }
  }

  private resolveOp(result: OperationResult, node: AstNode): SantaiObject {
    if (isOperationError(result)) {
      if (result.right) {
        this.report(
          node,
          MessageTemplate.kUnsupportedBinaryOperation,
          result.op,
          result.left.typeName,
          result.right.typeName
        );
      } else {
        this.report(
          node,
          MessageTemplate.kUnsupportedUnaryOperation,
          result.op,
          result.left.typeName
        );
      }
      return santaiKosong;
    }
    return result;
  }

  override visitCall(node: Call): SantaiObject {
    const fn = this.evaluate(node.expression);
    const args: SantaiObject[] = node
      .arguments()
      .map((arg) => this.evaluate(arg));

    if (fn.isBuiltinClass()) {
      return fn.construct(args);
    }

    if (fn.isCLass()) {
      return this.instantiateClass(fn, args, node);
    }

    if (fn.isFunction()) {
      return this.callFunction(fn, args, node);
    }

    if (fn.isBuiltinFunction()) {
      const callable: BuiltinCallable = fn.callable();
      const self: SantaiObject | undefined = fn.self();
      return callable(self, args);
    }

    this.report(node, MessageTemplate.kCalledNoCallable, fn.typeName);
    return santaiKosong;
  }

  private instantiateClass(
    klass: SantaiClass,
    args: SantaiObject[],
    node: AstNode
  ): SantaiObject {
    const instance = new SantaiInstance(klass);

    const ctor = klass.constructorFn;
    if (ctor) {
      const bound = new SantaiFunction(
        ctor.name,
        ctor.parameters,
        ctor.body,
        ctor.closure,
        instance
      );
      this.callFunction(bound, args, node);
    }

    return instance;
  }

  private callFunction(
    fn: SantaiFunction,
    args: SantaiObject[],
    node: AstNode
  ): SantaiObject {
    const fnEnv = Environment.new(fn.closure);
    const params = fn.parameters;

    for (let i = 0; i < params.length; i++) {
      if (!fnEnv.declare(params[i]!, args[i] ?? santaiKosong)) {
        this.report(node, MessageTemplate.kVarRedeclaration, params[i]!.name);
      }
    }

    // If method boundThis exists, declare `__gue__` in this frame.
    // The variable is created by kConst so that it cannot be reassigned from Santai code.
    if (!isUndefined(fn.boundThis)) {
      const gueVar = new Variable(GUE_SLOT, VariableMode.kConst);
      fnEnv.declare(gueVar, fn.boundThis);
    }

    this.callStack.push({
      functionName: fn.name,
      location: getLocationForNode(node),
    });

    try {
      return this.evaluateStatements(fn.body.statements(), fnEnv);
    } catch (signal) {
      if (isReturnSignal(signal)) {
        return signal.value;
      }

      throw signal;
    } finally {
      this.callStack.pop();
    }
  }

  override visitLiteral(node: Literal): SantaiObject {
    switch (node.type) {
      case LiteralType.kEmpty:
        return santaiKosong;
      case LiteralType.kBoolean:
        return SantaiBoolean.of(node.asBooleanLiteral());
      case LiteralType.kNumber:
        return new SantaiNumber(node.asNumber());
      case LiteralType.kString:
        return new SantaiString(node.asStringLiteral());
    }
  }

  override visitVariableExpression(node: VariableExpression): SantaiObject {
    const value: SantaiObject | undefined = this.env.get(node.name);

    if (value) {
      return value;
    }

    this.report(node, MessageTemplate.kNotDefined, node.name);
    return santaiKosong;
  }

  private evaluateStatements(
    statements: readonly Statement[],
    env: Environment
  ): SantaiObject {
    const previousEnv = this.env;
    this.env = env;
    let result: SantaiObject = santaiKosong;

    try {
      for (const statement of statements) {
        result = this.evaluate(statement);
      }
    } finally {
      this.env = previousEnv;
    }

    return result;
  }

  report(node: AstNode, message: MessageTemplate, ...args: unknown[]): void {
    assertDefined(node);
    const location = getLocationForNode(node);

    if (this.callStack.length > 0) {
      this.errorHandler.reportErrorWithStack(
        location,
        message,
        [...this.callStack],
        ...args
      );
    } else {
      this.errorHandler.reportErrorAt(location, message, ...args);
    }
  }

  reportAt(
    location: ScannerLocation,
    message: MessageTemplate,
    ...args: unknown[]
  ): void;
  reportAt(
    locationOrBegin: ScannerLocation | number,
    messageOrEnd: MessageTemplate | number,
    messageTemplate: MessageTemplate,
    ...args: unknown[]
  ): void {
    let location: ScannerLocation;
    let message: MessageTemplate;

    if (typeof locationOrBegin === "number") {
    } else {
      location = locationOrBegin;
    }

    if (isNumber(locationOrBegin)) {
      assert(isNumber(messageOrEnd));
      location = makeLocation(locationOrBegin, messageOrEnd);
      message = messageTemplate;
    } else {
      assert(isObject(locationOrBegin));
      location = locationOrBegin;
      message = messageOrEnd;
    }

    this.errorHandler.reportErrorAt(location, message, ...args);
  }
}
