// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { Block } from "../base/ast";
import { isUndefined } from "../base/types";
import { Variable } from "../base/variable";
import { BuiltinCallable } from "../builtins/builtin";
import { Environment } from "../interpreter/environment";
import { SantaiIterator } from "./iterator";

export const enum SantaiType {
  kKosong,
  kBoolen,
  kNumber,
  kString,
  kFunction,
  kBuiltinFunction,
  kList,
  kRange,
  kClass,
  Kinstance,
  kBuiltinClass,
  kError,
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
  isRange(): this is SantaiRange {
    return this.type === SantaiType.kRange;
  }
  isCLass(): this is SantaiClass {
    return this.type === SantaiType.kClass;
  }
  isInstance(): this is SantaiInstance {
    return this.type === SantaiType.Kinstance;
  }
  isBuiltinClass(): this is SantaiBuiltinClass {
    return this.type === SantaiType.kBuiltinClass;
  }

  /**
   * Returns `true` if the object can be iterated over.
   */
  isIterable(): boolean {
    return false;
  }

  /**
   * Returns properties or methods by name
   */
  getProperty(_name: string): SantaiObject | undefined {
    return undefined;
  }

  getSubscript(_obj: SantaiObject): SantaiObject | undefined {
    return undefined;
  }

  setSubscript(_obj: SantaiObject, _value: SantaiObject): boolean {
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
}

export class SantaiKosong extends SantaiObject {
  static readonly instance = new SantaiKosong();
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
}

const santaiKosong: SantaiKosong = SantaiKosong.instance;

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

  override getSubscript(obj: SantaiObject): SantaiObject | undefined {
    if (!obj.isNumber()) {
      return undefined;
    }

    const value = this.value[obj.value];
    if (!value) {
      return santaiKosong;
    }

    return new SantaiString(value);
  }
}

export class SantaiFunction extends SantaiObject {
  override readonly typeName = "Aksi";

  constructor(
    readonly name: string,
    readonly parameters: readonly Variable[],
    readonly body: Block,
    readonly closure: Environment,
    /**
     * If this is a method bound to an instance, this field contains
     * the instance. The interpreter will set `this = boundThis`
     * before executing body.
     * `undefined` for regular functions (not methods).
     */
    readonly boundThis?: SantaiObject
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

  get elements(): readonly SantaiObject[] {
    return this._elements;
  }

  constructor(private _elements: SantaiObject[]) {
    super(SantaiType.kList);
  }

  override inspect(): string {
    let str: string = "[";

    for (let i = 0; i < this.elements.length; i++) {
      const element = this.elements[i] ?? santaiKosong;

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

  override getSubscript(obj: SantaiObject): SantaiObject | undefined {
    if (!obj.isNumber()) {
      return undefined;
    }

    return this.elements[obj.value];
  }

  override setSubscript(obj: SantaiObject, value: SantaiObject): boolean {
    if (!obj.isNumber()) {
      return false;
    }

    this._elements[obj.value] = value;
    return true;
  }
}

class RangeIterator extends SantaiIterator {
  private current: number;

  constructor(
    start: number,
    private readonly stop: number,
    private readonly step: number
  ) {
    super();
    this.current = start;
  }

  override hasNext(): boolean {
    return this.step > 0 ? this.current < this.stop : this.current > this.stop;
  }

  override next(): IteratorResult<SantaiNumber> {
    if (!this.hasNext()) {
      return { value: undefined as never, done: true };
    }

    const value = new SantaiNumber(this.current);
    this.current += this.step;
    return { value, done: false };
  }
}

export class SantaiRange extends SantaiObject {
  override readonly typeName = "Rentang";

  readonly start: number;
  readonly stop: number;
  readonly step: number;

  constructor(start: number, stop: number, step: number) {
    super(SantaiType.kRange);
    this.start = start;
    this.stop = stop;
    this.step = step;
  }

  get size(): number {
    if (this.step > 0) {
      return Math.max(0, Math.ceil((this.stop - this.start) / this.step));
    }

    return Math.max(0, Math.ceil((this.start - this.stop) / -this.step));
  }

  override isTruthy(): boolean {
    return this.size > 0;
  }

  override inspect(): string {
    if (this.step === 1) {
      return this.start === 0
        ? `rentang(${this.stop})`
        : `rentang(${this.start}, ${this.stop})`;
    }

    return `rentang(${this.start}, ${this.stop}, ${this.step})`;
  }

  override isIterable(): boolean {
    return true;
  }

  override iterate(): SantaiIterator {
    return new RangeIterator(this.start, this.stop, this.step);
  }

  override getSubscript(obj: SantaiObject): SantaiObject | undefined {
    if (!obj.isNumber()) {
      return undefined;
    }

    const potentialValue: number = this.start + obj.value * this.step;

    if (this.step > 0) {
      if (potentialValue < this.start || potentialValue >= this.stop) {
        return undefined;
      }
    } else {
      if (potentialValue > this.start || potentialValue <= this.stop) {
        return undefined;
      }
    }

    return new SantaiNumber(potentialValue);
  }
}

/**
 * Sets the instance that is being inspected in the current call stack.
 *
 * Prevent infinite recursion when there are circular references between instances
 * (e.g. `oyen.child = micha` and `micha.parent = oyen`).
 *
 * Use module-level `Set` (not a field in a class) for one guard
 * applies to the entire call stack — no need to pass to each
 * recursive call.
 */
const _inspectingInstances: Set<SantaiInstance> = new Set();

/**
 * Santai class representation defined with `gue ClassName { ... }`.
 *
 * `SantaiClass` is the first object of the class (callable) and it can be called
 * to create a new instance, stored in a variable, and passed to the 'aksi'.
 */
export class SantaiClass extends SantaiObject {
  override readonly typeName: string;

  /**
   * All 'SantaiFunction' methods that are not yet bound to the instance.
   */
  private readonly _methods: ReadonlyMap<string, SantaiFunction>;

  readonly constructorFn: SantaiFunction | undefined;

  constructor(
    readonly name: string,
    methods: readonly SantaiFunction[]
  ) {
    super(SantaiType.kClass);
    this.typeName = name;

    const map = new Map<string, SantaiFunction>();
    let ctor: SantaiFunction | undefined;

    for (const method of methods) {
      map.set(method.name, method);
      //TODO: check constructor automatically
      if (method.name === "awal") {
        ctor = method;
      }
    }

    this._methods = map;
    this.constructorFn = ctor;
  }

  /**
   * Searches for method by name and returns `SantaiFunction`
   * which has not been bound (boundThis = undefined). The interpreter will
   * binds to the instance when accessed via the instance.
   */
  getMethod(name: string): SantaiFunction | undefined {
    return this._methods.get(name);
  }

  override isTruthy(): boolean {
    return true;
  }

  override inspect(): string {
    return `<gue ${this.name}>`;
  }
}

export class SantaiInstance extends SantaiObject {
  override readonly typeName: string;

  private readonly _properties: Map<string, SantaiObject> = new Map();

  constructor(private readonly clazz: SantaiClass) {
    super(SantaiType.Kinstance);
    this.typeName = clazz.name;
  }

  getClass(): SantaiClass {
    return this.clazz;
  }

  setProperty(name: string, value: SantaiObject): void {
    this._properties.set(name, value);
  }

  /**
   * Reads properties belonging to this instance (excluding class methods)
   */
  getOwnProperty(name: string): SantaiObject | undefined {
    return this._properties.get(name);
  }

  /**
   * Search for properties or methods.
   *
   * Priority:
   *    1. Own properties (`_properties`) — result of assignment `gue.x = v`
   *    2. Class method (`_class`) — returned as `SantaiFunction`
   *       with `boundThis = this` so that `gue` in the method refers to here
   *
   * Returns `undefined` if not found in both.
   */
  override getProperty(name: string): SantaiObject | undefined {
    // 1. Check own property first
    const ownProperty = this.getOwnProperty(name);
    if (!isUndefined(ownProperty)) {
      return ownProperty;
    }

    // 2. Look in the class method, bind it to this instance
    const method = this.clazz.getMethod(name);
    if (!isUndefined(method)) {
      // Create a new RelaxFunction with boundThis = this instance.
      // Each access creates a new object
      // TODO: caching
      return new SantaiFunction(
        method.name,
        method.parameters,
        method.body,
        method.closure,
        this // boundThis
      );
    }

    return undefined;
  }

  override isTruthy(): boolean {
    return true;
  }

  override inspect(): string {
    if (_inspectingInstances.has(this)) {
      return `${this.clazz.name} { ... }`;
    }

    _inspectingInstances.add(this);

    try {
      const props = [...this._properties.entries()]
        .map(([k, v]) => `${k}: ${v.inspect()}`)
        .join(", ");
      return props.length > 0
        ? `${this.clazz.name} { ${props} }`
        : `${this.clazz.name} {}`;
    } finally {
      _inspectingInstances.delete(this);
    }
  }
}

export class SantaiBuiltinClass extends SantaiObject {
  override readonly typeName: string = "Type";

  constructor(
    readonly name: string,
    readonly santaiType: SantaiType,
    private readonly _construct: (args: SantaiObject[]) => SantaiObject
  ) {
    super(SantaiType.kBuiltinClass);
  }

  construct(args: SantaiObject[]): SantaiObject {
    return this._construct(args);
  }

  override isTruthy(): boolean {
    return true;
  }

  override inspect(): string {
    return `<gue ${this.name}>`;
  }
}

export class SantaiError extends SantaiObject {
  override typeName: string;

  constructor(
    readonly message: string,
    readonly name: string = "Masalah"
  ) {
    super(SantaiType.kError);
    this.typeName = name;
  }

  override isTruthy(): boolean {
    return true;
  }

  override inspect(): string {
    return `${this.name}: ${this.message}`;
  }

  override getProperty(name: string): SantaiObject | undefined {
    switch (name) {
      case "pesan":
        return new SantaiString(this.message);
      case "nama":
        return new SantaiString(this.name);
      default:
        return undefined;
    }
  }
}

export namespace Factory {
  export const Kosong: SantaiKosong = SantaiKosong.instance;
  export const True: SantaiBoolean = SantaiBoolean.TRUE;
  export const False: SantaiBoolean = SantaiBoolean.FALSE;

  export function NewNumber(value: number): SantaiNumber {
    return new SantaiNumber(value);
  }

  export function NewString(value: string): SantaiString {
    return new SantaiString(value);
  }

  export function Boolean(value: boolean): SantaiBoolean {
    return SantaiBoolean.of(value);
  }

  export function NewList(elements: SantaiObject[]): SantaiList {
    return new SantaiList(elements);
  }

  export function NewRange(
    start: number,
    stop: number,
    step: number
  ): SantaiRange {
    return new SantaiRange(start, stop, step);
  }

  export function NewFunction(
    name: string,
    parameters: readonly Variable[],
    body: Block,
    closure: Environment,
    boundThis?: SantaiObject | undefined
  ): SantaiFunction {
    return new SantaiFunction(name, parameters, body, closure, boundThis);
  }

  export function NewBuiltinFunction(
    name: string,
    callable: BuiltinCallable,
    self?: SantaiObject | undefined
  ): BuiltinFunction {
    return new BuiltinFunction(name, callable, self);
  }

  export function NewClas(
    name: string,
    methods: readonly SantaiFunction[]
  ): SantaiClass {
    return new SantaiClass(name, methods);
  }

  export function NewInstance(clazz: SantaiClass): SantaiInstance {
    return new SantaiInstance(clazz);
  }

  export function NewBuiltinClass(
    name: string,
    santaiType: SantaiType,
    construct: (args: SantaiObject[]) => SantaiObject
  ): SantaiBuiltinClass {
    return new SantaiBuiltinClass(name, santaiType, construct);
  }
}
