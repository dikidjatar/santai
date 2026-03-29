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
  EmptyParentheses,
  EmptyStatement,
  Expression,
  ForInStatement,
  FunctionDeclaration,
  FunctionLiteral,
  IfStatement,
  ListLiteral,
  Literal,
  LiteralType,
  Property,
  ReturnStatement,
  Statement,
  ThisExpression,
  ThrowStatement,
  TryStatement,
  UnaryOp,
  VariableDeclaration,
  VariableExpression,
  WhileStatement,
} from "../base/ast";
import { ErrorHandler, StackFrame } from "../base/errorHandler";
import { MessageTemplate } from "../base/messageTemplate";
import {
  isNumber,
  isObject,
  isUndefined,
  isUndefinedOrNull,
  Signal,
} from "../base/types";
import { Variable, VariableMode } from "../base/variable";
import { BuiltinRegistry, CallSite } from "../builtins/builtin";
import "../builtins/globals";
import { SantaiIterator } from "../objects/iterator";
import {
  Factory,
  SantaiClass,
  SantaiFunction,
  SantaiObject,
} from "../objects/object";
import {
  Operation,
  OperationError,
  OperationResult,
} from "../objects/operations";
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
class ThrowSignal extends Signal<ThrowStatement> {
  constructor(
    node: ThrowStatement,
    readonly value: SantaiObject
  ) {
    super(node);
  }
}

function isReturnSignal(signal: unknown): signal is ReturnSignal {
  return signal instanceof ReturnSignal;
}

function isBreakSignal(signal: unknown): signal is BreakSignal {
  return signal instanceof BreakSignal;
}

function isContinueSignal(signal: unknown): signal is ContinueSignal {
  return signal instanceof ContinueSignal;
}

function isThrowSignal(signal: unknown): signal is ThrowSignal {
  return signal instanceof ThrowSignal;
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

export class Interpreter extends AstVisitor<SantaiObject> implements CallSite {
  private readonly globalEnv: Environment;
  private env: Environment;

  // Save the currently active node for callbacks from the builtin
  // still have location context for error reporting.
  private currentCallNode: AstNode | undefined;

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
      } else if (isThrowSignal(error)) {
        const message = error.value.inspect();
        const location = makeLocation(error.node.position, error.node.position);
        this.errorHandler.reportError(location, message, "dilempar disini");
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
      return Factory.Kosong;
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
      case node.isFunctionLiteral():
        return this.visitFunctionLiteral(node);
      case node.isEmptyParentheses():
        return this.visitEmptyParentheses(node);
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
      case node.isTryStatement():
        return this.visitTryStatement(node);
      case node.isThrowStatement():
        return this.visitThrowStatement(node);
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
    let value: SantaiObject = Factory.Kosong;
    const initializer = node.initializer();

    if (initializer) {
      value = this.evaluate(initializer);
    } else if (variable.isConst()) {
      this.report(node, MessageTemplate.kConstDeclMissingInitialize);
      return Factory.Kosong;
    }

    if (!this.env.declare(variable, value)) {
      this.report(node, MessageTemplate.kVarRedeclaration, variable.name);
    }

    return Factory.Kosong;
  }

  override visitFunctionDeclaration(node: FunctionDeclaration): SantaiObject {
    const variable = node.variable();
    assertDefined(variable);
    assert(variable.isFunction());

    const functionObj: SantaiFunction = Factory.NewFunction(
      variable.name,
      node.params,
      node.body,
      this.env
    );
    if (!this.env.declare(variable, functionObj)) {
      this.report(node, MessageTemplate.kVarRedeclaration, functionObj.name);
    }

    return Factory.Kosong;
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
      return Factory.Kosong;
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
    if (!loopEnv.declare(variable, Factory.Kosong)) {
      this.report(node, MessageTemplate.kVarRedeclaration, variable.name);
      return Factory.Kosong;
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

    return Factory.Kosong;
  }

  override visitClassDeclaration(node: ClassDeclaration): SantaiObject {
    const variable: Variable | undefined = node.variable();
    assertDefined(variable);

    const methods: SantaiFunction[] = node.methods.map((method) => {
      return Factory.NewFunction(
        method.name,
        method.params,
        method.body,
        this.env
      );
    });

    const klass = Factory.NewClas(node.className, methods);

    if (!this.env.declare(variable, klass)) {
      this.report(node, MessageTemplate.kVarRedeclaration, node.className);
    }

    return Factory.Kosong;
  }

  override visitProperty(node: Property): SantaiObject {
    const obj = this.evaluate(node.object);
    const propertyNode: Expression = node.property;

    if (propertyNode.isLiteral() && propertyNode.isStringLiteral()) {
      const propertyName = propertyNode.asStringLiteral();
      const property = obj.getProperty(propertyName);

      if (!isUndefined(property)) {
        return property;
      }

      this.report(
        node,
        MessageTemplate.kPropertyNotFound,
        propertyName,
        obj.typeName
      );
    } else {
      const keyObj: SantaiObject = this.evaluate(propertyNode);
      const result = obj.getSubscript(keyObj);

      if (!isUndefined(result)) {
        return result;
      }
    }

    return Factory.Kosong;
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

  override visitFunctionLiteral(node: FunctionLiteral): SantaiObject {
    return Factory.NewFunction(
      "<aksi anonim>",
      node.params,
      node.body,
      this.env
    );
  }

  override visitEmptyParentheses(_node: EmptyParentheses): SantaiObject {
    return Factory.Kosong;
  }

  /**
   * Extracts property names from `Property` as strings.
   */
  // private resolvePropertyName(node: Property): string {
  //   const property = node.property;

  //   if (property.isLiteral() && property.isStringLiteral()) {
  //     return property.asStringLiteral();
  //   }

  //   return this.evaluate(node).inspect();
  // }

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

    return Factory.Kosong;
  }

  override visitBlock(node: Block): SantaiObject {
    const blockEnv = Environment.new(this.env);
    return this.evaluateStatements(node.statements(), blockEnv);
  }

  override visitReturnStatement(node: ReturnStatement): SantaiObject {
    const expression = node.expression;
    const value = expression ? this.evaluate(expression) : Factory.Kosong;
    throw new ReturnSignal(node, value);
  }

  override visitBreakStatement(node: BreakStatement): SantaiObject {
    throw new BreakSignal(node);
  }

  override visitContinueStatement(node: ContinueStatement): SantaiObject {
    throw new ContinueSignal(node);
  }

  override visitEmptyStatement(_node: EmptyStatement): SantaiObject {
    return Factory.Kosong;
  }

  override visitIfStatement(node: IfStatement): SantaiObject {
    const condition: SantaiObject = this.evaluate(node.condition);

    if (!condition) {
      return Factory.Kosong;
    }

    if (condition.isTruthy()) {
      return this.evaluate(node.then);
    } else if (node.hasElseStatement()) {
      return this.evaluate(node.orelse);
    } else {
      return Factory.Kosong;
    }
  }

  override visitTryStatement(node: TryStatement): SantaiObject {
    let pendingSignal: unknown = null;

    try {
      this.evaluate(node.body);
    } catch (signal) {
      if (isThrowSignal(signal) && !isUndefined(node.catchBody)) {
        const catchEnv = Environment.new(this.env);

        if (!isUndefined(node.catchVariable)) {
          catchEnv.declare(node.catchVariable, signal.value);
        }

        const previousEnv = this.env;
        this.env = catchEnv;

        try {
          this.evaluate(node.catchBody);
        } catch {
          this.env = previousEnv;
        }
      } else {
        pendingSignal = signal;
      }
    } finally {
      if (!isUndefined(node.finallyBody)) {
        this.evaluate(node.finallyBody);
      }
    }

    if (!isUndefinedOrNull(pendingSignal)) {
      throw pendingSignal;
    }

    return Factory.Kosong;
  }

  override visitThrowStatement(node: ThrowStatement): SantaiObject {
    const value = this.evaluate(node.expression);
    throw new ThrowSignal(node, value);
  }

  override visitDeclarationList(node: DeclarationList): SantaiObject {
    for (const declaration of node.declarations) {
      assert(declaration.isVariableDeclaration());
      this.visitVariableDeclaration(declaration);
    }

    return Factory.Kosong;
  }

  override visitAssignment(node: Assignment): SantaiObject {
    const value = this.evaluate(node.value);

    if (!this.assignToTarget(node.target, value)) {
      return Factory.Kosong;
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
      const propertyKey: Expression = target.property;

      if (propertyKey.isLiteral() && propertyKey.isStringLiteral()) {
        const propertyName = propertyKey.asStringLiteral();

        if (!obj.isInstance()) {
          this.report(
            target,
            MessageTemplate.kCannotSetProperty,
            propertyName,
            obj.typeName
          );
          return false;
        }

        obj.setProperty(propertyName, value);
        return true;
      } else {
        const keyObj = this.evaluate(propertyKey);
        return obj.setSubscript(keyObj, value);
      }
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
        return Factory.Kosong;
      }

      elements.push(element);
    }

    return Factory.NewList(elements);
  }

  override visitUnaryOp(node: UnaryOp): SantaiObject {
    const right = this.evaluate(node.expression);
    const op = node.op;

    switch (op) {
      case TokenValue.kNot:
        return Factory.Boolean(!right.isTruthy());
      case TokenValue.kSub: {
        if (!right.isNumber()) {
          this.report(
            node,
            MessageTemplate.kUnsupportedUnaryOperation,
            Token.string(op),
            right.typeName
          );
          return Factory.Kosong;
        }
        return Factory.NewNumber(-right.value);
      }
      case TokenValue.kAdd: {
        if (!right.isNumber()) {
          this.report(
            node,
            MessageTemplate.kUnsupportedUnaryOperation,
            Token.string(op),
            right.typeName
          );
          return Factory.Kosong;
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
        return Factory.False;
      } else {
        const right: SantaiObject = this.evaluate(node.right);
        return Factory.Boolean(right.isTruthy());
      }
    }

    if (op === TokenValue.kAtau) {
      if (left.isTruthy()) {
        return Factory.True;
      } else {
        const right = this.evaluate(node.right);
        return Factory.Boolean(right.isTruthy());
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
        return resolve(Operation.Add(left, right));
      case TokenValue.kSub:
        return resolve(Operation.Sub(left, right));
      case TokenValue.kMul:
        return resolve(Operation.Mul(left, right));
      case TokenValue.kDiv:
        return resolve(Operation.Div(left, right));
      case TokenValue.kMod:
        return resolve(Operation.Mod(left, right));
      case TokenValue.kExp:
        return resolve(Operation.Exp(left, right));

      case TokenValue.kEq:
        return resolve(Operation.Eq(left, right));
      case TokenValue.kNotEq: {
        const eq = resolve(Operation.Eq(left, right));
        assert(eq.isBoolean());
        return Factory.Boolean(!eq.value);
      }

      case TokenValue.kLessThan:
        return resolve(Operation.Lt(left, right));
      case TokenValue.kGreaterThan:
        return resolve(Operation.Gt(left, right));
      case TokenValue.kLessThanEq: {
        // a <= b  =  !(a > b)
        const gt = resolve(Operation.Gt(left, right));
        assert(gt.isBoolean());
        return Factory.Boolean(!gt.value);
      }
      case TokenValue.kGreaterThanEq: {
        // a >= b  =  !(a < b)
        const lt = resolve(Operation.Lt(left, right));
        assert(lt.isBoolean());
        return Factory.Boolean(!lt.value);
      }

      default:
        this.report(
          node,
          MessageTemplate.kUnsupportedBinaryOperation,
          Token.string(op),
          left.typeName,
          right.typeName
        );
        return Factory.Kosong;
    }
  }

  private resolveOp(result: OperationResult, node: AstNode): SantaiObject {
    if (!result.ok) {
      const error: OperationError = result.value;

      if (error.right) {
        if (error.isDivideByZero) {
          this.report(node, MessageTemplate.kDivisionByZero);
        } else if (error.isModuleByZero) {
          this.report(node, MessageTemplate.kIntegerModuleByZero);
        } else {
          this.report(
            node,
            MessageTemplate.kUnsupportedBinaryOperation,
            error.op,
            error.left.typeName,
            error.right.typeName
          );
        }
      } else {
        this.report(
          node,
          MessageTemplate.kUnsupportedUnaryOperation,
          error.op,
          error.left.typeName
        );
      }
      return Factory.Kosong;
    }

    return result.value;
  }

  invoke(fn: SantaiObject, args: SantaiObject[]): SantaiObject {
    const node = this.currentCallNode;

    if (fn.isBuiltinClass()) return fn.construct(args);
    if (fn.isCLass() && node) return this.instantiateClass(fn, args, node);
    if (fn.isFunction() && node) return this.callFunction(fn, args, node);
    if (fn.isBuiltinFunction()) {
      return fn.callable()(fn.self(), args, this);
    }

    return Factory.Kosong;
  }

  override visitCall(node: Call): SantaiObject {
    const fn = this.evaluate(node.expression);
    const args: SantaiObject[] = node
      .arguments()
      .map((arg) => this.evaluate(arg));

    const previousCallNode = this.currentCallNode;
    this.currentCallNode = node;

    try {
      if (fn.isBuiltinClass()) return fn.construct(args);
      if (fn.isCLass()) return this.instantiateClass(fn, args, node);
      if (fn.isFunction()) return this.callFunction(fn, args, node);
      if (fn.isBuiltinFunction()) {
        return fn.callable()(fn.self(), args, this);
      }

      this.report(node, MessageTemplate.kCalledNoCallable, fn.typeName);
      return Factory.Kosong;
    } finally {
      this.currentCallNode = previousCallNode;
    }
  }

  private instantiateClass(
    klass: SantaiClass,
    args: SantaiObject[],
    node: AstNode
  ): SantaiObject {
    const instance = Factory.NewInstance(klass);

    const ctor = klass.constructorFn;
    if (ctor) {
      const bound = Factory.NewFunction(
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
      if (!fnEnv.declare(params[i]!, args[i] ?? Factory.Kosong)) {
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
        return Factory.Kosong;
      case LiteralType.kBoolean:
        return Factory.Boolean(node.asBooleanLiteral());
      case LiteralType.kNumber:
        return Factory.NewNumber(node.asNumber());
      case LiteralType.kString:
        return Factory.NewString(node.asStringLiteral());
    }
  }

  override visitVariableExpression(node: VariableExpression): SantaiObject {
    const value: SantaiObject | undefined = this.env.get(node.name);

    if (value) {
      return value;
    }

    this.report(node, MessageTemplate.kNotDefined, node.name);
    return Factory.Kosong;
  }

  private evaluateStatements(
    statements: readonly Statement[],
    env: Environment
  ): SantaiObject {
    const previousEnv = this.env;
    this.env = env;
    let result: SantaiObject = Factory.Kosong;

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
