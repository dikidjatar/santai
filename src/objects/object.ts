// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { Block } from "../base/ast";
import { Variable } from "../base/variable";
import { BuiltinCallable } from "../builtins/builtin";
import { Environment } from "../interpreter/environment";
import { SantaiIterator } from "./iterator";

export class OperationError {
  constructor(
    readonly op: string,
    readonly left: SantaiObject,
    readonly right: SantaiObject | undefined = undefined
  ) {}
}

export type OperationResult = SantaiObject | OperationError;

function operationError(
  op: string,
  left: SantaiObject,
  right?: SantaiObject
): OperationError {
  return new OperationError(op, left, right);
}

export function isOperationError(r: OperationResult): r is OperationError {
  return r instanceof OperationError;
}

export const enum SantaiType {
  kKosong,
  kBoolen,
  kNumber,
  kString,
  kFunction,
  kBuiltinFunction,
  kList,
}

export abstract class SantaiObject {
  abstract readonly typeName: string;

  constructor(readonly type: SantaiType) {}

  abstract inspect(): string;
  abstract isTruthy(): boolean;

  isKosong(): this is SantaiKosong {
    return this.type === SantaiType.kKosong;
  }
  isBoolean(): this is SantaiBoolean {
    return this.type === SantaiType.kBoolen;
  }
  isNumber(): this is SantaiNumber {
    return this.type === SantaiType.kNumber;
  }
  isString(): this is SantaiString {
    return this.type === SantaiType.kString;
  }
  isFunction(): this is SantaiFunction {
    return this.type === SantaiType.kFunction;
  }
  isBuiltinFunction(): this is BuiltinFunction {
    return this.type === SantaiType.kBuiltinFunction;
  }
  isList(): this is SantaiList {
    return this.type === SantaiType.kList;
  }

  /**
   * Returns `true` if the object can be iterated over.
   */
  isIterable(): boolean {
    return false;
  }

  /**
   * Creates a new iterator for this object.
   *
   * @throws {Error} if the object is not an iterable
   */
  iterate(): SantaiIterator {
    throw new Error(`'${this.typeName}' is not iterable`);
  }

  opAdd(other: SantaiObject): OperationResult {
    return operationError("+", this, other);
  }
  opSub(other: SantaiObject): OperationResult {
    return operationError("-", this, other);
  }
  opMul(other: SantaiObject): OperationResult {
    return operationError("*", this, other);
  }
  opDiv(other: SantaiObject): OperationResult {
    return operationError("/", this, other);
  }
  opMod(other: SantaiObject): OperationResult {
    return operationError("%", this, other);
  }
  opExp(other: SantaiObject): OperationResult {
    return operationError("**", this, other);
  }
  opEquals(other: SantaiObject): OperationResult {
    return operationError("==", this, other);
  }
  opLessThan(other: SantaiObject): OperationResult {
    return operationError("<", this, other);
  }
  opGreaterThan(other: SantaiObject): OperationResult {
    return operationError(">", this, other);
  }
}

export class SantaiKosong extends SantaiObject {
  static readonly INSTANCE = new SantaiKosong();
  override readonly typeName = "Kosong";

  constructor() {
    super(SantaiType.kKosong);
  }

  override isTruthy(): boolean {
    return false;
  }

  override inspect(): string {
    return "kosong";
  }

  override opEquals(other: SantaiObject): OperationResult {
    // kosong == kosong -> true, kosong == any -> false
    return other.isKosong() ? SantaiBoolean.TRUE : SantaiBoolean.FALSE;
  }
}

export class SantaiBoolean extends SantaiObject {
  static readonly TRUE = new SantaiBoolean(true);
  static readonly FALSE = new SantaiBoolean(false);
  override readonly typeName = "Logika";

  static of(value: boolean): SantaiBoolean {
    return value ? SantaiBoolean.TRUE : SantaiBoolean.FALSE;
  }

  private constructor(readonly value: boolean) {
    super(SantaiType.kBoolen);
  }

  override isTruthy(): boolean {
    return this.value;
  }

  override inspect(): string {
    return this.value ? "bener" : "hoaks";
  }

  override opEquals(other: SantaiObject): OperationResult {
    if (!other.isBoolean()) {
      return operationError("==", this, other);
    }
    return SantaiBoolean.of(this.value === other.value);
  }
}

export class SantaiNumber extends SantaiObject {
  override readonly typeName = "Angka";

  constructor(readonly value: number) {
    super(SantaiType.kNumber);
  }

  override isTruthy(): boolean {
    return this.value !== 0;
  }

  override inspect(): string {
    return String(this.value);
  }

  private numOp(
    op: string,
    other: SantaiObject,
    fn: (a: number, b: number) => number
  ): OperationResult {
    if (!other.isNumber()) {
      return operationError(op, this, other);
    }
    return new SantaiNumber(fn(this.value, other.value));
  }

  private cmpOp(
    other: SantaiObject,
    fn: (a: number, b: number) => boolean
  ): OperationResult {
    if (!other.isNumber()) {
      return SantaiBoolean.FALSE;
    }
    return SantaiBoolean.of(fn(this.value, other.value));
  }

  override opAdd(other: SantaiObject) {
    return this.numOp("+", other, (a, b) => a + b);
  }
  override opSub(other: SantaiObject) {
    return this.numOp("-", other, (a, b) => a - b);
  }
  override opMul(other: SantaiObject) {
    return this.numOp("*", other, (a, b) => a * b);
  }
  override opDiv(other: SantaiObject) {
    return this.numOp("/", other, (a, b) => a / b);
  }
  override opMod(other: SantaiObject) {
    return this.numOp("%", other, (a, b) => a % b);
  }
  override opExp(other: SantaiObject) {
    return this.numOp("**", other, (a, b) => a ** b);
  }

  override opEquals(other: SantaiObject) {
    return this.cmpOp(other, (a, b) => a === b);
  }
  override opLessThan(other: SantaiObject) {
    return this.cmpOp(other, (a, b) => a < b);
  }
  override opGreaterThan(other: SantaiObject) {
    return this.cmpOp(other, (a, b) => a > b);
  }
}

/**
 * Iterates the string character-by-character based on Unicode code-points
 */
class StringIterator extends SantaiIterator {
  private readonly chars: string[];
  private index: number = 0;

  constructor(source: SantaiString) {
    super();
    this.chars = [...source.value];
  }

  override hasNext(): boolean {
    return this.index < this.chars.length;
  }

  override next(): IteratorResult<SantaiString> {
    if (!this.hasNext()) {
      return { value: undefined as never, done: true };
    }

    return { value: new SantaiString(this.chars[this.index++]), done: false };
  }
}

export class SantaiString extends SantaiObject {
  override readonly typeName = "Teks";

  constructor(readonly value: string) {
    super(SantaiType.kString);
  }

  override isTruthy(): boolean {
    return this.value.length > 0;
  }

  override inspect(): string {
    return this.value;
  }

  override isIterable(): boolean {
    return true;
  }

  override iterate(): SantaiIterator {
    return new StringIterator(this);
  }

  override opAdd(other: SantaiObject): OperationResult {
    if (!other.isString()) {
      if (other.isNumber() || other.isBoolean()) {
        return new SantaiString(this.value + other.inspect());
      }

      return operationError("+", this, other);
    }

    return new SantaiString(this.value + other.value);
  }

  override opEquals(other: SantaiObject): OperationResult {
    if (!other.isString()) {
      return operationError("==", this, other);
    }

    return SantaiBoolean.of(this.value === other.value);
  }

  override opLessThan(other: SantaiObject): OperationResult {
    if (!other.isString()) {
      return operationError("<", this, other);
    }

    return SantaiBoolean.of(this.value < other.value);
  }

  override opGreaterThan(other: SantaiObject): OperationResult {
    if (!other.isString()) {
      return operationError(">", this, other);
    }

    return SantaiBoolean.of(this.value > other.value);
  }
}

export class SantaiFunction extends SantaiObject {
  override readonly typeName = "Aksi";

  constructor(
    readonly name: string,
    readonly parameters: readonly Variable[],
    readonly body: Block,
    readonly closure: Environment
  ) {
    super(SantaiType.kFunction);
  }

  override isTruthy(): boolean {
    return true;
  }

  override inspect(): string {
    return `<aksi ${this.name}>`;
  }
}

export class BuiltinFunction extends SantaiObject {
  override typeName: string = "Aksi";

  constructor(
    readonly name: string,
    private readonly _callable: BuiltinCallable,
    private readonly _self?: SantaiObject
  ) {
    super(SantaiType.kBuiltinFunction);
  }

  override inspect(): string {
    return `<bawaan aksi ${this.name}>`;
  }

  override isTruthy(): boolean {
    return true;
  }

  callable(): BuiltinCallable {
    return this._callable;
  }

  self(): SantaiObject | undefined {
    return this._self;
  }
}

class ListIterator extends SantaiIterator {
  private readonly elements: readonly SantaiObject[];
  private index: number = 0;

  constructor(list: SantaiList) {
    super();
    this.elements = list.elements;
  }

  override hasNext(): boolean {
    return this.index < this.elements.length;
  }

  override next(): IteratorResult<SantaiObject> {
    if (!this.hasNext()) {
      return { value: undefined as never, done: true };
    }

    return { value: this.elements[this.index++], done: false };
  }
}

export class SantaiList extends SantaiObject {
  override typeName: string = "Daftar";

  get length(): number {
    return this.elements.length;
  }

  constructor(readonly elements: readonly SantaiObject[]) {
    super(SantaiType.kList);
  }

  override inspect(): string {
    let str: string = "[";

    for (let i = 0; i < this.elements.length; i++) {
      const element = this.elements[i];

      if (element.isString()) {
        str += "'" + element.inspect() + "'";
      } else {
        str += element.inspect();
      }

      if (i < this.elements.length - 1) {
        str += ", ";
      }
    }

    str += "]";
    return str;
  }

  override isTruthy(): boolean {
    return this.elements.length !== 0;
  }

  override isIterable(): boolean {
    return true;
  }

  override iterate(): SantaiIterator {
    return new ListIterator(this);
  }
}
