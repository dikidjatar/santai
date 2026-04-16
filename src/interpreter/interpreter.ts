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
  ExtensionFunctionDeclaration,
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
  TemplateLiteral,
  ThrowStatement,
  TryStatement,
  UnaryOp,
  VariableDeclaration,
  VariableExpression,
  WhileStatement,
} from "../ast/ast";
import { Variable, VariableMode } from "../ast/variable";
import { assert, assertDefined, unreachable } from "../base/asserts";
import {
  ErrorHandler,
  ErrorTypeNameFromTemplate,
  formatMessage,
  StackFrame,
} from "../base/errorHandler";
import { MessageTemplate } from "../base/messageTemplate";
import { isUndefined } from "../base/types";
import { globalProvideRegistry } from "../builtins/globalProvider";
import "../builtins/globals";
import { registerExtension } from "../objects/extensionRegistry";
import {
  BuiltinFunction,
  CallSite,
  Factory,
  GlobalMethodParam,
  SantaiClass,
  SantaiFunction,
  SantaiIterator,
  SantaiObject,
} from "../objects/object";
import {
  OperationError,
  OperationResult,
  TokenToOperation,
} from "../objects/operations";
import {
  callSpecialMethod,
  coerceToString,
  evaluateTruthy,
} from "../objects/protocol";
import { createIterator } from "../objects/protocolIterator";
import {
  ReflectedSpecialName,
  SpecialName,
  TokenToSpecialName,
} from "../objects/specialNames";
import { makeLocation, ScannerLocation } from "../parsing/scanner";
import { Token, TokenValue } from "../parsing/token";
import { ServiceContainer } from "../runtime/serviceContainer";
import { Environment, VariableSlot } from "./environment";
import {
  BreakSignal,
  ContinueSignal,
  isBreakSignal,
  isContinueSignal,
  isReturnSignal,
  isRuntimeErrorSignal,
  isThrowSignal,
  ReturnSignal,
  RuntimeErrorSignal,
  ThrowSignal,
} from "./flows";

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
    case node.isLiteral(): {
      if (node.isStringLiteral()) {
        return makeLocation(
          begin + 1,
          begin + node.asStringLiteral().length + 1
        );
      } else if (node.isNumberLiteral()) {
        return end(node.asNumber().toString().length);
      } else if (node.isBooleanLiteral()) {
        return end(String(node.asBooleanLiteral()).length);
      } else if (node.isKosongLiteral()) {
        return end(6);
      }
      unreachable();
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

function getArgLocation(arg: CallArgument): ScannerLocation | AstNode {
  return arg.isNamed()
    ? makeLocation(arg.namePos!, arg.namePos! + arg.name!.length)
    : arg.value;
}

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

export class Interpreter extends AstVisitor<SantaiObject> {
  private readonly globalEnv: Environment;
  private env: Environment;

  /**
   * Call stack for runtime one entry per active user-defined function.
   * Pushed when entering `visitCall`, popped when exiting (in `finally`).
   * Included in `reportErrorWithStack` so diagnostic output has a stack trace.
   */
  private readonly callStack: StackFrame[] = [];

  constructor(
    private readonly errorHandler: ErrorHandler,
    private readonly serviceContainer: ServiceContainer
  ) {
    super();
    this.globalEnv = new Environment();
    this.env = this.globalEnv;
    this.registerBuiltinsGlobals();
  }

  private registerBuiltinsGlobals(): void {
    const globals = globalProvideRegistry.resolveAll(this.serviceContainer);
    for (const [name, value] of globals) {
      const variable: Variable = new Variable(name, VariableMode.kConst);
      this.globalEnv.declare(variable, value);
    }
  }

  execute(program: AstNode): void {
    try {
      this.visit(program);
    } catch (error) {
      if (isReturnSignal(error)) {
        this.errorHandler.reportErrorAt(
          getLocationForNode(error.node),
          MessageTemplate.kIllegalReturnStatement
        );
      } else if (isBreakSignal(error)) {
        this.errorHandler.reportErrorAt(
          getLocationForNode(error.node),
          MessageTemplate.kIllegalBreakStatement
        );
      } else if (isContinueSignal(error)) {
        this.errorHandler.reportErrorAt(
          getLocationForNode(error.node),
          MessageTemplate.kIllegalContinueStatement
        );
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

  /**
   * Creates an ephemeral CallSite scoped to `node`.
   *
   * The returned object is cheap (two closure functions over `node` and
   * `this`) and is discarded after the call completes.  There is no
   * reference-counting or manual clean-up needed.
   */
  private makeCallSite(node: AstNode): CallSite {
    return {
      invoke: (fn: SantaiObject, args: SantaiObject[]): SantaiObject => {
        const directArgs: DirectArg[] = args.map((v) => ({
          evaluatedValue: v,
        }));
        return this.dispatch(fn, directArgs, node);
      },
      throw: (message: MessageTemplate, ...args: unknown[]): never => {
        return this.reportAndThrow(node, message, ...args);
      },
    };
  }

  override visit(node: AstNode): SantaiObject {
    assertDefined(node);

    // if (this.errorHandler.hasErrors()) {
    //   return Factory.Kosong;
    // }

    switch (true) {
      case node.isVariableDeclaration():
        return this.visitVariableDeclaration(node);
      case node.isFunctionDeclaration():
        return this.visitFunctionDeclaration(node);
      case node.isClassDeclaration():
        return this.visitClassDeclaration(node);
      case node.isExtensionFunctionDeclaration():
        return this.visitExtensionFunctionDeclaration(node);
      case node.isProperty():
        return this.visitProperty(node);
      case node.isFunctionLiteral():
        return this.visitFunctionLiteral(node);
      case node.isEmptyParentheses():
        return this.visitEmptyParentheses(node);
      case node.isTemplateLiteral():
        return this.visitTemplateLiteral(node);
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
      this.reportAndThrow(node, MessageTemplate.kConstDeclMissingInitialize);
    }

    if (!this.env.declare(variable, value)) {
      this.reportAndThrow(
        node,
        MessageTemplate.kVarRedeclaration,
        variable.name
      );
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
      this.reportAndThrow(
        node,
        MessageTemplate.kVarRedeclaration,
        functionObj.name
      );
    }

    return Factory.Kosong;
  }

  override visitExtensionFunctionDeclaration(
    node: ExtensionFunctionDeclaration
  ): SantaiObject {
    const fn = Factory.NewFunction(
      node.methodName,
      node.params,
      node.body,
      this.env
      // Stored unbound, bound lazily in visitProperty
    );

    registerExtension(node.receiverName, node.methodName, fn);
    return Factory.Kosong;
  }

  override visitForInStatement(node: ForInStatement): SantaiObject {
    const iterable: SantaiObject = this.evaluate(node.iterable);
    const callsite = this.makeCallSite(node.iterable);

    // createIterator throws via callsite if the object is not iterable.
    const iterator: SantaiIterator = createIterator(callsite, iterable);

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
      this.reportAndThrow(
        node,
        MessageTemplate.kVarRedeclaration,
        variable.name
      );
    }

    try {
      while (iterator.hasNext()) {
        try {
          const next = iterator.next();
          if (next.done) break;
          // Set iteration variable value for this iteration.
          loopEnv.update(variable, next.value);
          this.evaluate(body);
        } catch (signal) {
          if (isBreakSignal(signal)) break;
          if (isContinueSignal(signal)) continue;
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

    const klass = Factory.NewClass(node.className, methods);

    if (!this.env.declare(variable, klass)) {
      this.reportAndThrow(
        node,
        MessageTemplate.kVarRedeclaration,
        node.className
      );
    }

    return Factory.Kosong;
  }

  override visitProperty(node: Property): SantaiObject {
    const obj = this.evaluate(node.object);
    const propertyNode: Expression = node.property;

    if (propertyNode.isLiteral() && propertyNode.isStringLiteral()) {
      const propertyName = propertyNode.asStringLiteral();

      const callsite = this.makeCallSite(propertyNode);
      const getPropertyMethod = obj.getProperty(SpecialName.__ambilproperti__);
      if (!isUndefined(getPropertyMethod)) {
        return callSpecialMethod(callsite, getPropertyMethod, undefined, [
          Factory.NewString(propertyName),
        ]);
      }

      const property = obj.getProperty(propertyName);
      if (!isUndefined(property)) return property;

      if (obj.isBuiltinClass() || obj.isClass()) {
        const method = obj.getMethod(propertyName);
        if (!isUndefined(method)) return method;
      }

      const extensionFn = obj.getExtension(obj.typeName, propertyName);
      if (!isUndefined(extensionFn)) {
        return extensionFn.bindAndCopy(obj);
      }

      this.reportAndThrow(
        node,
        MessageTemplate.kPropertyNotFound,
        propertyName,
        obj.typeName
      );
    } else {
      const keyObj: SantaiObject = this.evaluate(propertyNode);

      if (obj.isInstance()) {
        const getItem = obj.getProperty(SpecialName.__ambil__);
        if (getItem) {
          return this.dispatch(
            getItem,
            [{ evaluatedValue: keyObj }],
            propertyNode
          );
        }
      }

      const result = obj.getSubscript(keyObj);

      if (!isUndefined(result)) {
        return result;
      }

      this.reportAndThrow(
        node,
        MessageTemplate.KCannotGetSubscript,
        obj.typeName
      );
    }
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

  override visitTemplateLiteral(node: TemplateLiteral): SantaiObject {
    let result = node.quasis[0];

    for (let i = 0; i < node.expressions.length; i++) {
      const exprNode = node.expressions[i]!;
      const value = this.evaluate(exprNode);
      const callsite = this.makeCallSite(exprNode);
      result += coerceToString(callsite, value);
      result += node.quasis[i + 1]!;
    }

    return Factory.NewString(result);
  }

  override visitWhileStatement(node: WhileStatement): SantaiObject {
    const conditionExpression: Expression = node.condition;
    assertDefined(conditionExpression);
    const callsite = this.makeCallSite(conditionExpression);

    while (true) {
      const condition: SantaiObject = this.evaluate(conditionExpression);

      if (!evaluateTruthy(callsite, condition)) {
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
    this.evaluateStatements(node.statements(), blockEnv);
    return Factory.Kosong;
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

    const callsite = this.makeCallSite(node.condition);
    if (evaluateTruthy(callsite, condition)) {
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
        this.reportAndThrow(target, MessageTemplate.kNotDefined, target.name);
      }

      if (!this.env.update(variableInfo.variable, value)) {
        this.reportAndThrow(
          target,
          MessageTemplate.kAssignToContantVariable,
          variableInfo.variable.name
        );
      }

      return true;
    } else if (target.isProperty()) {
      const obj = this.evaluate(target.object);
      const propertyKey: Expression = target.property;

      if (propertyKey.isLiteral() && propertyKey.isStringLiteral()) {
        const propertyName = propertyKey.asStringLiteral();

        if (!obj.setProperty(propertyName, value)) {
          this.reportAndThrow(
            target,
            MessageTemplate.kCannotSetProperty,
            propertyName,
            obj.typeName
          );
        }

        return true;
      } else {
        const keyObj = this.evaluate(propertyKey);
        if (obj.isInstance()) {
          const setItem = obj.getProperty(SpecialName.__atur__);
          if (setItem) {
            this.dispatch(
              setItem,
              [{ evaluatedValue: keyObj }, { evaluatedValue: value }],
              target
            );
            return true;
          }
        }
        return obj.setSubscript(keyObj, value);
      }
    } else {
      this.reportAndThrow(target, MessageTemplate.kInvalidAssignmentTarget);
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
        const callsite = this.makeCallSite(node);
        return Factory.Boolean(!evaluateTruthy(callsite, right));
      case TokenValue.kSub: {
        if (!right.isNumber()) {
          this.reportAndThrow(
            node,
            MessageTemplate.kUnsupportedUnaryOperation,
            Token.string(op),
            right.typeName
          );
        }
        return Factory.NewNumber(-right.value);
      }
      case TokenValue.kAdd: {
        if (!right.isNumber()) {
          this.reportAndThrow(
            node,
            MessageTemplate.kUnsupportedUnaryOperation,
            Token.string(op),
            right.typeName
          );
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
    const callsite = this.makeCallSite(node);

    if (op === TokenValue.kDan) {
      if (!evaluateTruthy(callsite, left)) return Factory.False;
      const right: SantaiObject = this.evaluate(node.right);
      return Factory.Boolean(evaluateTruthy(callsite, right));
    }

    if (op === TokenValue.kAtau) {
      if (evaluateTruthy(callsite, left)) return Factory.True;
      const right = this.evaluate(node.right);
      return Factory.Boolean(evaluateTruthy(callsite, right));
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
    if (op === TokenValue.kDi) {
      const method = right.getProperty(SpecialName.__berisi__);
      if (method) {
        return this.dispatch(method, [{ evaluatedValue: left }], node);
      }
    }

    const specialName = TokenToSpecialName[op];
    if (!isUndefined(specialName)) {
      const method = left.getProperty(specialName);
      if (method) {
        return this.dispatch(method, [{ evaluatedValue: right }], node);
      }

      const reflectedSpecialName = ReflectedSpecialName[specialName];
      if (reflectedSpecialName) {
        const rmethod = right.getProperty(reflectedSpecialName);
        if (rmethod) {
          return this.dispatch(rmethod, [{ evaluatedValue: left }], node);
        }
      }
    }

    // Reached only for types that have NOT registered special methods.
    const opFn = TokenToOperation[op];
    if (opFn) {
      return this.resolveOp(opFn(left, right), node);
    }

    this.reportAndThrow(
      node,
      MessageTemplate.kUnsupportedBinaryOperation,
      Token.string(op),
      left.typeName,
      right.typeName
    );
  }

  private resolveOp(result: OperationResult, node: AstNode): SantaiObject {
    if (!result.ok) {
      const error: OperationError = result.value;

      if (error.right) {
        if (error.isDivideByZero) {
          this.reportAndThrow(node, MessageTemplate.kDivisionByZero);
        } else if (error.isModuleByZero) {
          this.reportAndThrow(node, MessageTemplate.kIntegerModuleByZero);
        } else {
          this.reportAndThrow(
            node,
            MessageTemplate.kUnsupportedBinaryOperation,
            error.op,
            error.left.typeName,
            error.right.typeName
          );
        }
      } else {
        this.reportAndThrow(
          node,
          MessageTemplate.kUnsupportedUnaryOperation,
          error.op,
          error.left.typeName
        );
      }
    }

    return result.value;
  }

  override visitCall(node: Call): SantaiObject {
    const fn = this.evaluate(node.expression);
    const args: CallArgument[] = node.arguments();
    return this.dispatch(fn, args, node);
  }

  private dispatch(
    fn: SantaiObject,
    args: AnyArg[],
    node: AstNode
  ): SantaiObject {
    if (fn.isBuiltinClass()) {
      const initMethod = fn.getMethod(SpecialName.__awal__) as
        | BuiltinFunction
        | undefined;
      if (!isUndefined(initMethod)) {
        return this.callBuiltinFunction(initMethod.bindAndCopy(fn), args, node);
      }
    }

    if (fn.isClass()) return this.instantiateClass(fn, args, node);
    if (fn.isFunction()) return this.callFunction(fn, args, node);
    if (fn.isBuiltinFunction()) return this.callBuiltinFunction(fn, args, node);

    this.reportAndThrow(node, MessageTemplate.kCalledNoCallable, fn.typeName);
  }

  /**
   * Evaluation of args as positional for callable without signature/legacy.
   */
  private evalPositional(args: AnyArg[]): SantaiObject[] {
    return args.map((a) =>
      isDirectArg(a) ? a.evaluatedValue : this.evaluate(a.value)
    );
  }

  private callBuiltinFunction(
    fn: BuiltinFunction,
    args: AnyArg[],
    node: AstNode
  ): SantaiObject {
    const callsite = this.makeCallSite(node);
    if (fn.hasSignature()) {
      const resolvedParams = this.resolveBuiltinParams(fn.params!);
      const bound = this.bindArguments(
        fn.name,
        resolvedParams,
        fn.self ? [{ evaluatedValue: fn.self }, ...args] : args,
        node
      );
      if (!bound) return Factory.Kosong;
      return fn.call(fn.self, bound, callsite);
    }
    return fn.call(fn.self, this.evalPositional(args), callsite);
  }

  private instantiateClass(
    klass: SantaiClass,
    args: AnyArg[],
    node: AstNode
  ): SantaiObject {
    const instance = Factory.NewInstance(klass);

    const ctor = klass.getConstructor();
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
    const bound = this.bindArguments(
      fn.name,
      resolved,
      !isUndefined(fn.boundThis)
        ? [{ evaluatedValue: fn.boundThis }, ...args]
        : args,
      node
    );
    if (!bound) return Factory.Kosong;

    const fnEnv = Environment.new(fn.closure);
    const params = fn.parameters;

    for (let i = 0; i < params.length; i++) {
      if (!fnEnv.declare(params[i]!.variable, bound[i]!)) {
        this.reportAndThrow(
          node,
          MessageTemplate.kVarRedeclaration,
          params[i]!.name
        );
      }
    }

    this.callStack.push({
      functionName: fn.name,
      location: getLocationForNode(node),
    });

    try {
      this.evaluateStatements(fn.body.statements(), fnEnv);
      return Factory.Kosong;
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
    params: readonly GlobalMethodParam[]
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
  ): SantaiObject[] {
    // Indexed by param name slot, initially undefined = not filled
    const slots: Map<string, SantaiObject | undefined> = new Map(
      params.map((param) => [param.name, undefined])
    );

    let positionalIndex: number = 0;

    for (const arg of args) {
      const isDirect = isDirectArg(arg);
      const value: SantaiObject = isDirect
        ? arg.evaluatedValue
        : this.evaluate(arg.value);

      const argName = !isDirect && arg.isNamed() ? arg.name : undefined;
      const argLoc = !isDirect ? getArgLocation(arg) : node;

      if (!argName) {
        if (positionalIndex >= params.length) {
          this.reportAndThrow(
            argLoc as any,
            MessageTemplate.kTooManyArguments,
            fnName,
            params.length
          );
        }
        slots.set(params[positionalIndex++]!.name, value);
      } else {
        if (!slots.has(argName)) {
          this.reportAndThrow(
            argLoc as any,
            MessageTemplate.kUnexpectedKeywordArgument,
            argName!,
            fnName
          );
        }

        if (slots.get(argName) !== undefined) {
          // has been filled in by the previous position
          this.reportAndThrow(
            argLoc as any,
            MessageTemplate.kDuplicateArgument,
            argName!
          );
        }

        slots.set(argName, value);
      }
    }

    // Fill in the default for empty slots
    for (const param of params) {
      if (slots.get(param.name) === undefined) {
        if (param.hasDefault) {
          slots.set(param.name, param.resolveDefault!());
        } else {
          this.reportAndThrow(
            node,
            MessageTemplate.kMissingArgument,
            param.name,
            fnName
          );
        }
      }
    }

    // Return as a positional array of parameter sequences
    return params.map((param) => slots.get(param.name)!);
  }

  override visitLiteral(node: Literal): SantaiObject {
    switch (node.type) {
      case LiteralType.kKosong:
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

    this.reportAndThrow(node, MessageTemplate.kNotDefined, node.name);
  }

  private evaluateStatements(
    statements: readonly Statement[],
    env: Environment
  ): void {
    const previousEnv = this.env;
    this.env = env;

    try {
      for (const statement of statements) {
        this.evaluate(statement);
      }
    } finally {
      this.env = previousEnv;
    }
  }

  reportAndThrow(
    location: ScannerLocation,
    message: MessageTemplate,
    ...args: unknown[]
  ): never;
  reportAndThrow(
    node: AstNode,
    message: MessageTemplate,
    ...args: unknown[]
  ): never;
  reportAndThrow(
    locationOrNode: ScannerLocation | AstNode,
    message: MessageTemplate,
    ...args: unknown[]
  ): never {
    assertDefined(locationOrNode);
    const location =
      locationOrNode instanceof AstNode
        ? getLocationForNode(locationOrNode)
        : locationOrNode;
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
      Factory.NewError(formatted, ErrorTypeNameFromTemplate(message))
    );
  }
}
