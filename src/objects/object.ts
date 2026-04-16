// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { Block, Parameter } from "../ast/ast";
import { MessageTemplate } from "../base/messageTemplate";
import { isUndefined } from "../base/types";
import { Environment } from "../interpreter/environment";
import { getAllExtensions, lookupExtension } from "./extensionRegistry";
import { listPropertyNames, lookupProperty } from "./propertyRegistry";
import { SpecialName } from "./specialNames";
import { SantaiType } from "./st-type";

export interface CallSite {
  /**
   * Invoke a Santai callable
   */
  invoke(fn: SantaiObject, args: SantaiObject[]): SantaiObject;

  /**
   * Report a runtime error at this call site and throw.
   */
  throw(message: MessageTemplate, ...args: unknown[]): never;
}

/**
 * The function signature that every builtin callable implements.
 *
 * `self`     — the bound receiver (undefined for global functions).
 * `args`     — positional arguments, already evaluated and bound
 * `callsite` — scoped context for this particular call.
 */
export type Callable = (
  self: SantaiObject | undefined,
  args: SantaiObject[],
  callsite: CallSite
) => SantaiObject;

/**
 * One parameter descriptor for global functions.
 */
export interface GlobalMethodParam {
  readonly name: string;
  /**
   * `undefined`     = mandatory parameter, must be filled with caller
   * `SantaiObject`  = Optional, use this value if not filled
   */
  readonly defaultValue?: SantaiObject;
}

/**
 * Tuple type for the four-argument form of `Factory.NewBuiltinFunction`.
 */
export type MethodArg = [
  name: string,
  callable: Callable,
  self?: SantaiObject,
  params?: readonly GlobalMethodParam[],
];

export abstract class SantaiObject {
  abstract readonly typeName: string;

  constructor(readonly type: SantaiType) {}

  abstract inspect(): string;
  abstract isTruthy(): boolean;

  isKosong(): this is SantaiKosong {
    return this.type === SantaiType.kKosong;
  }
  isBoolean(): this is SantaiBoolean {
    return this.type === SantaiType.kBoolean;
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
  isClass(): this is SantaiClass {
    return this.type === SantaiType.kClass;
  }
  isInstance(): this is SantaiInstance {
    return this.type === SantaiType.kInstance;
  }
  isBuiltinClass(): this is BuiltinClass {
    return this.type === SantaiType.kBuiltinClass;
  }
  isError(): this is SantaiError {
    return this.type === SantaiType.kError;
  }
  isPair(): this is SantaiPair {
    return this.type === SantaiType.kPair;
  }
  isMap(): this is SantaiMap {
    return this.type === SantaiType.kMap;
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
  getProperty(name: string): SantaiObject | undefined {
    return lookupProperty(this.type, name, this) as SantaiObject | undefined;
  }

  getPropertyAs<T extends SantaiObject>(name: string): T | undefined {
    return this.getProperty(name) as T;
  }

  setProperty(_name: string, _value: SantaiObject): boolean {
    return false;
  }

  getSubscript(_obj: SantaiObject): SantaiObject | undefined {
    return undefined;
  }

  setSubscript(_obj: SantaiObject, _value: SantaiObject): boolean {
    return false;
  }

  getExtension(name: string, methodName: string): SantaiFunction | undefined {
    return lookupExtension(name, methodName);
  }

  /**
   * Creates a new iterator for this object.
   *
   * @throws {Error} if the object is not an iterable
   */
  iterate(): SantaiIterator {
    throw new Error(`'${this.typeName}' is not iterable`);
  }

  hasLength(): boolean {
    return false;
  }

  getLength(): number {
    return 0;
  }

  /**
   * Retu1n all name property/method for this object.
   */
  dir(): readonly string[] {
    return listPropertyNames(this.type);
  }
}

export abstract class SantaiIterator
  extends SantaiObject
  implements Iterator<SantaiObject>, Iterable<SantaiObject>
{
  override readonly typeName: string = "SantaiIterator";
  constructor() {
    super(SantaiType.kIterator);
  }
  abstract hasNext(): boolean;
  abstract next(): IteratorResult<SantaiObject, any>;

  override isTruthy(): boolean {
    return this.hasNext();
  }

  override inspect(): string {
    return `<gue ${this.typeName}>`;
  }

  [Symbol.iterator](): Iterator<SantaiObject> {
    return this;
  }
}

export class SantaiKosong extends SantaiObject {
  static readonly instance = new SantaiKosong();
  override readonly typeName = "kosong";

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
  override readonly typeName = "logika";

  static of(value: boolean): SantaiBoolean {
    return value ? SantaiBoolean.TRUE : SantaiBoolean.FALSE;
  }

  private constructor(readonly value: boolean) {
    super(SantaiType.kBoolean);
  }

  override isTruthy(): boolean {
    return this.value;
  }

  override inspect(): string {
    return this.value ? "benar" : "salah";
  }
}

export class SantaiNumber extends SantaiObject {
  override readonly typeName = "angka";

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
  override readonly typeName = "teks";

  constructor(readonly value: string) {
    super(SantaiType.kString);
  }

  override isTruthy(): boolean {
    return this.value.length > 0;
  }

  override inspect(): string {
    return this.value;
  }

  override hasLength(): boolean {
    return true;
  }

  override getLength(): number {
    return this.value.length;
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
  override readonly typeName = "aksi";

  constructor(
    readonly name: string,
    readonly parameters: readonly Parameter[],
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

  /**
   * Return a copy of this function bound to receiver
   */
  bindAndCopy(receiver: SantaiObject): SantaiFunction {
    return new SantaiFunction(
      this.name,
      this.parameters,
      this.body,
      this.closure,
      receiver // boundThis
    );
  }

  override isTruthy(): boolean {
    return true;
  }

  override inspect(): string {
    return `<aksi ${this.name}>`;
  }
}

export class BuiltinFunction extends SantaiObject {
  override typeName: string = "aksi";

  get self(): SantaiObject | undefined {
    return this._self;
  }

  constructor(
    readonly name: string,
    private readonly callable: Callable,
    private _self?: SantaiObject,
    readonly params?: readonly GlobalMethodParam[]
  ) {
    super(SantaiType.kBuiltinFunction);
  }

  override inspect(): string {
    return `<bawaan aksi ${this.self ? `${this.self.typeName}.` : ""}${this.name}>`;
  }

  override isTruthy(): boolean {
    return true;
  }

  hasSignature(): boolean {
    return !isUndefined(this.params);
  }

  call(
    self: SantaiObject | undefined,
    args: SantaiObject[],
    callsite: CallSite
  ): SantaiObject {
    return this.callable(self, args, callsite);
  }

  bindAndCopy(receiver: SantaiObject): BuiltinFunction {
    return new BuiltinFunction(this.name, this.callable, receiver, this.params);
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
  override typeName: string = "daftar";

  get elements(): readonly SantaiObject[] {
    return this._elements;
  }

  constructor(private _elements: SantaiObject[]) {
    super(SantaiType.kList);
  }

  push(...items: SantaiObject[]): number {
    return this._elements.push(...items);
  }

  remove(index: number): SantaiObject {
    if (index < 0 || index >= this._elements.length) {
      return Factory.Kosong;
    }
    return this._elements.splice(index, 1)[0];
  }

  clear(): void {
    this._elements.splice(0, this._elements.length);
  }

  reverse(): this {
    this._elements.reverse();
    return this;
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

  override hasLength(): boolean {
    return true;
  }

  override getLength(): number {
    return this.elements.length;
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
  override readonly typeName = "rentang";

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

  override hasLength(): boolean {
    return true;
  }

  override getLength(): number {
    return this.size;
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

  constructor(
    readonly name: string,
    methods: readonly SantaiFunction[]
  ) {
    super(SantaiType.kClass);
    this.typeName = name;
    this._methods = new Map(methods.map((method) => [method.name, method]));
  }

  getConstructor(): SantaiFunction | undefined {
    return this._methods.get(SpecialName.__awal__);
  }

  /**
   * Searches for method by name and returns `SantaiFunction`
   * which has not been bound (boundThis = undefined). The interpreter will
   * binds to the instance when accessed via the instance.
   */
  getMethod(name: string): SantaiFunction | undefined {
    return this._methods.get(name);
  }

  methodNames(): readonly string[] {
    return [...this._methods.keys()].sort();
  }

  override dir(): readonly string[] {
    return this.methodNames();
  }

  override hasLength(): boolean {
    return false;
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
    super(SantaiType.kInstance);
    this.typeName = clazz.name;
  }

  getClass(): SantaiClass {
    return this.clazz;
  }

  override setProperty(name: string, value: SantaiObject): boolean {
    this._properties.set(name, value);
    return true;
  }

  override setSubscript(obj: SantaiObject, value: SantaiObject): boolean {
    if (!obj.isString() && !obj.isNumber()) {
      return false;
    }
    this._properties.set(obj.value.toString(), value);
    return true;
  }

  override getSubscript(obj: SantaiObject): SantaiObject | undefined {
    if (!obj.isString() && !obj.isNumber()) {
      return undefined;
    }
    return this.getProperty(obj.value.toString());
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
    // Extension high priority (can override class method)
    const extension = this.getExtension(this.clazz.name, name);
    if (!isUndefined(extension)) return extension.bindAndCopy(this);

    // Check own property first
    const ownProperty = this.getOwnProperty(name);
    if (!isUndefined(ownProperty)) {
      return ownProperty;
    }

    // Look in the class method, bind it to this instance
    const method = this.clazz.getMethod(name);
    if (!isUndefined(method)) {
      return method.bindAndCopy(this);
    }

    return method;
  }

  override isIterable(): boolean {
    return !isUndefined(this.getIteratorMethod());
  }

  /**
   * Not called directly for instances.
   * The interpreter uses `createIterator(callsite, instance)` instead so that
   * `__iterasi__` and `__lanjut__` receive a properly-scoped CallSite.
   */
  override iterate(): SantaiIterator {
    throw new Error(
      `'${this.typeName}': call createIterator(callsite, obj) instead of iterate() directly`
    );
  }

  private getIteratorMethod(): SantaiFunction | undefined {
    const method = this.getProperty(SpecialName.__iterasi__);
    if (!isUndefined(method) && method.isFunction()) {
      return method;
    }
    return undefined;
  }

  override dir(): readonly string[] {
    const extensions = getAllExtensions(this.clazz.name);
    const ownProps = [...this._properties.keys()];
    const classMethods = this.clazz.methodNames();
    return [
      ...new Set([
        ...extensions.map((fn) => fn.name),
        ...ownProps,
        ...classMethods,
      ]),
    ].sort();
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

export class BuiltinClass extends SantaiObject {
  override readonly typeName: string;

  private readonly _methods: Map<string, BuiltinFunction> = new Map();

  constructor(
    readonly name: string,
    readonly santaiType: SantaiType,
    methods: readonly BuiltinFunction[]
  ) {
    super(SantaiType.kBuiltinClass);
    this.typeName = name;
    for (const method of methods) {
      this._methods.set(method.name, method);
    }
  }

  getMethod(name: string): SantaiObject | undefined {
    return this._methods.get(name);
  }

  override hasLength(): boolean {
    return false;
  }

  override isTruthy(): boolean {
    return true;
  }

  override inspect(): string {
    return `<gue ${this.name}>`;
  }
}

export class SantaiError extends SantaiObject {
  override readonly typeName: string = "Masalah";

  constructor(
    readonly message: string,
    readonly name: string = "Masalah"
  ) {
    super(SantaiType.kError);
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

  override dir(): readonly string[] {
    return ["nama", "pesan"];
  }

  override isTruthy(): boolean {
    return true;
  }

  override inspect(): string {
    return `${this.name}: ${this.message}`;
  }
}

export class SantaiPair extends SantaiObject {
  override readonly typeName: string = "Pasangan";

  constructor(
    readonly id: string,
    readonly value: SantaiObject
  ) {
    super(SantaiType.kPair);
  }

  override isTruthy(): boolean {
    return true;
  }

  override inspect(): string {
    return `Pasangan { id: ${this.id}, value: ${this.value.inspect()} }`;
  }
}

export class SantaiMapIterator extends SantaiIterator {
  private readonly values: MapIterator<SantaiPair>;

  constructor(private readonly map: SantaiMap) {
    super();
    this.values = map.getValues();
  }

  override hasNext(): boolean {
    return this.map.size > 0;
  }

  override next(): IteratorResult<any> {
    return this.values.next();
  }
}

export class SantaiMap extends SantaiObject {
  override readonly typeName: string = "Peta";

  private readonly _data: Map<string, SantaiPair> = new Map();

  get size(): number {
    return this._data.size;
  }

  constructor(pairs: SantaiPair[]) {
    super(SantaiType.kMap);
    for (const pair of pairs) {
      this._data.set(pair.id, pair);
    }
  }

  getValue(id: string): SantaiPair | undefined {
    return this._data.get(id);
  }

  setValue(id: string, value: SantaiPair): void {
    this._data.set(id, value);
  }

  delete(id: string): boolean {
    return this._data.delete(id);
  }

  clear(): void {
    this._data.clear();
  }

  getEntries(): Readonly<MapIterator<[string, SantaiPair]>> {
    return this._data.entries();
  }

  getValues(): MapIterator<SantaiPair> {
    return this._data.values();
  }

  override isIterable(): boolean {
    return true;
  }

  override iterate(): SantaiIterator {
    return new SantaiMapIterator(this);
  }

  override hasLength(): boolean {
    return true;
  }

  override isTruthy(): boolean {
    return this._data.size !== 0;
  }

  override inspect(): string {
    return "Peta { }";
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
    parameters: readonly Parameter[],
    body: Block,
    closure: Environment,
    boundThis?: SantaiObject | undefined
  ): SantaiFunction {
    return new SantaiFunction(name, parameters, body, closure, boundThis);
  }

  export function NewBuiltinFunction(
    name: string,
    callable: Callable,
    self?: SantaiObject | undefined,
    params?: readonly GlobalMethodParam[]
  ): BuiltinFunction {
    return new BuiltinFunction(name, callable, self, params);
  }

  export function NewClass(
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
    methods: readonly BuiltinFunction[]
  ): BuiltinClass {
    return new BuiltinClass(name, santaiType, methods);
  }

  export function NewError(message: string, name: string): SantaiError {
    return new SantaiError(message, name);
  }

  export function NewPair(id: string, value: SantaiObject): SantaiPair {
    return new SantaiPair(id, value);
  }

  export function NewMap(pairs: SantaiPair[]): SantaiMap {
    return new SantaiMap(pairs);
  }

  export function IsCallable(obj: SantaiObject): boolean {
    return (
      obj.isFunction() ||
      obj.isBuiltinFunction() ||
      obj.isClass() ||
      obj.isBuiltinClass()
    );
  }
}
