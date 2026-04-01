// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  Assignment,
  AstNode,
  AstVisitor,
  BinaryOp,
  Block,
  BreakStatement,
  Call,
  CallArgument,
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
  Parameter,
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
} from "../ast/ast";
import { Variable, VariableMode } from "../ast/variable";
import { assert, assertDefined, unreachable } from "../base/asserts";
import { ErrorHandler, formatMessage, StackFrame } from "../base/errorHandler";
import { MessageTemplate } from "../base/messageTemplate";
import { isNumber, isObject, isUndefined, Signal } from "../base/types";
import { BuiltinRegistry, CallSite } from "../builtins/builtin";
import "../builtins/globals";
import { BuiltinParam } from "../builtins/paramSpec";
import { SantaiIterator } from "../objects/iterator";
import {
  Factory,
  SantaiClass,
  SantaiError,
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

class RuntimeErrorSignal extends Signal<AstNode> {
  constructor(
    node: AstNode,
    readonly error: SantaiError
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

function isRuntimeErrorSignal(signal: unknown): signal is RuntimeErrorSignal {
  return signal instanceof RuntimeErrorSignal;
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
    case node.isProperty(): {
      if (node.property.isLiteral() && node.property.isStringLiteral()) {
        return end(node.property.asStringLiteral().length);
      }
      return end(0);
    }
    //TODO: Add other node
    default:
      return end(0);
  }
}

/**
 * The arguments that have been evaluated. Are used by invoke() of the callsite.
 * Builtins saring, olah, etc. Calling invoke() with SantaiObject[],
 * not CallArgument[]. This path is always positional, no need for binding.
 */
interface DirectArg {
  readonly evaluatedValue: SantaiObject;
}

function isDirectArg(a: CallArgument | DirectArg): a is DirectArg {
  return "evaluatedValue" in a;
}

type AnyArg = CallArgument | DirectArg;

/**
 * The parameter descriptor has been resolved to a uniform form.
 */
interface ResolvedParam {
  readonly name: string;
  readonly hasDefault: boolean;
  /**
   * The Lazy function is called right when the default is needed.
   * For fn user: evaluation of expression in closure.
   * For builtin: return the existing SantaiObject.
   */
  readonly resolveDefault?: () => SantaiObject;
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
      } else if (isRuntimeErrorSignal(error)) {
        this.errorHandler.flushPendingErrors();
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
    // Function literal has no default. Wrap variable[] to parameter[]
    const params: Parameter[] = node.params.map(
      (v) => new Parameter(v, undefined)
    );
    return Factory.NewFunction("<aksi anonim>", params, node.body, this.env);
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
    try {
      this.evaluate(node.body);
    } catch (signal) {
      const isThrow = isThrowSignal(signal);
      const isRuntime = isRuntimeErrorSignal(signal);

      if (isThrow || isRuntime) {
        if (!isUndefined(node.catchVariable) && !isUndefined(node.catchBody)) {
          if (isRuntime) {
            this.errorHandler.clearLastError();
          }

          const errorValue: SantaiObject = isThrow
            ? signal.value // value from `lempar`
            : signal.error; // SantaiError from runtime error

          const catchEnv = Environment.new(this.env);
          catchEnv.declare(node.catchVariable, errorValue);
          this.evaluateStatements([node.catchBody], catchEnv);
        } else {
          throw signal;
        }
      } else {
        throw signal;
      }

      // if (isThrowSignal(signal) && !isUndefined(node.catchBody)) {
      //   const catchEnv = Environment.new(this.env);

      //   if (!isUndefined(node.catchVariable)) {
      //     catchEnv.declare(node.catchVariable, signal.value);
      //   }

      //   const previousEnv = this.env;
      //   this.env = catchEnv;

      //   try {
      //     this.evaluate(node.catchBody);
      //   } catch {
      //     this.env = previousEnv;
      //   }
      // } else {
      //   pendingSignal = signal;
      // }
    } finally {
      if (!isUndefined(node.finallyBody)) {
        this.evaluate(node.finallyBody);
      }
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
    if (!node) return Factory.Kosong;

    // builtins always call invoke() with positional args already
    // evaluated (saring, olah, etc. Wrap as DirectArg
    const directArgs: DirectArg[] = args.map((v) => ({ evaluatedValue: v }));
    return this.dispatch(fn, directArgs, node);
  }

  override visitCall(node: Call): SantaiObject {
    const fn = this.evaluate(node.expression);
    const args: CallArgument[] = node.arguments();

    const previousCallNode = this.currentCallNode;
    this.currentCallNode = node;

    try {
      return this.dispatch(fn, args, node);
    } finally {
      this.currentCallNode = previousCallNode;
    }
  }

  private dispatch(
    fn: SantaiObject,
    args: AnyArg[],
    node: AstNode
  ): SantaiObject {
    if (fn.isBuiltinClass()) {
      if (fn.hasSignature()) {
        const resolvedParams = this.resolveBuiltinParams(fn.params!);
        const bound = this.bindArguments(fn.name, resolvedParams, args, node);
        if (!bound) return Factory.Kosong;
        return fn.construct(bound);
      }
      return fn.construct(this.evalPositional(args));
    }

    if (fn.isCLass()) return this.instantiateClass(fn, args, node);
    if (fn.isFunction()) return this.callFunction(fn, args, node);

    if (fn.isBuiltinFunction()) {
      if (fn.hasSignature()) {
        const resolvedParams = this.resolveBuiltinParams(fn.params!);
        const bound = this.bindArguments(fn.name, resolvedParams, args, node);
        if (!bound) return Factory.Kosong;
        return fn.callable()(fn.self(), bound, this);
      }
      // No signature: legacy positional (varargs, backward compat)
      return fn.callable()(fn.self(), this.evalPositional(args), this);
    }

    this.report(node, MessageTemplate.kCalledNoCallable, fn.typeName);
    return Factory.Kosong;
  }

  /**
   * Evaluation of args as positional for callable without signature/legacy.
   */
  private evalPositional(args: AnyArg[]): SantaiObject[] {
    return args.map((a) =>
      isDirectArg(a) ? a.evaluatedValue : this.evaluate(a.value)
    );
  }

  private instantiateClass(
    klass: SantaiClass,
    args: AnyArg[],
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
    args: AnyArg[],
    node: AstNode
  ): SantaiObject {
    const resolved = this.resolveUserParams(fn.parameters, fn.closure);
    const bound = this.bindArguments(fn.name, resolved, args, node);
    if (!bound) return Factory.Kosong;

    const fnEnv = Environment.new(fn.closure);
    const params = fn.parameters;

    for (let i = 0; i < params.length; i++) {
      if (!fnEnv.declare(params[i]!.variable, bound[i]!)) {
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

  private resolveUserParams(
    params: readonly Parameter[],
    closure: Environment
  ): ResolvedParam[] {
    return params.map((param) => ({
      name: param.name,
      hasDefault: param.hasDefault(),
      resolveDefault: param.hasDefault()
        ? () => {
            // Default evaluation in closure
            const saved = this.env;
            this.env = closure;
            const value = this.evaluate(param.defaultValue!);
            this.env = saved;
            return value;
          }
        : undefined,
    }));
  }

  private resolveBuiltinParams(
    params: readonly BuiltinParam[]
  ): ResolvedParam[] {
    return params.map((param) => ({
      name: param.name,
      hasDefault: !isUndefined(param.defaultValue),
      resolveDefault: !isUndefined(param.defaultValue)
        ? () => param.defaultValue as SantaiObject
        : undefined,
    }));
  }

  private bindArguments(
    fnName: string,
    params: ResolvedParam[],
    args: AnyArg[],
    node: AstNode
  ): SantaiObject[] | undefined {
    // Indexed by param name slot, initially undefined = not filled
    const slots: Map<string, SantaiObject | undefined> = new Map(
      params.map((param) => [param.name, undefined])
    );

    let positionalIndex: number = 0;

    for (const arg of args) {
      const value: SantaiObject = isDirectArg(arg)
        ? arg.evaluatedValue
        : this.evaluate(arg.value);

      const named = !isDirectArg(arg) && arg.isNamed();
      const argName = named ? (arg as CallArgument).name! : undefined;

      if (!named) {
        if (positionalIndex >= params.length) {
          this.report(
            node,
            MessageTemplate.kTooManyArguments,
            fnName,
            params.length
          );
          return undefined;
        }
        slots.set(params[positionalIndex++]!.name, value);
      } else {
        if (!slots.has(argName!)) {
          this.report(
            node,
            MessageTemplate.kUnexpectedKeywordArgument,
            argName!,
            fnName
          );
          return undefined;
        }

        if (slots.get(argName!) !== undefined) {
          // has been filled in by the previous position
          this.report(node, MessageTemplate.kDuplicateArgument, argName!);
          return undefined;
        }

        slots.set(argName!, value);
      }
    }

    // Fill in the default for empty slots
    for (const param of params) {
      if (slots.get(param.name) === undefined) {
        if (param.hasDefault) {
          slots.set(param.name, param.resolveDefault!());
        } else {
          this.report(
            node,
            MessageTemplate.kMissingArgument,
            param.name,
            fnName
          );
          return undefined;
        }
      }
    }

    // Return as a positional array of parameter sequences
    return params.map((param) => slots.get(param.name)!);
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
    const formatted = formatMessage(message, args);

    if (this.callStack.length > 0) {
      this.errorHandler.recordErrorWithStack(
        location,
        message,
        [...this.callStack],
        ...args
      );
    } else {
      this.errorHandler.recordErrorAt(location, message, ...args);
    }

    throw new RuntimeErrorSignal(
      node,
      new SantaiError(formatted, "MasalahRuntime")
    );
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
