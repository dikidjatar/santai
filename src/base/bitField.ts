// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

export class BitField<T extends number | boolean> {
  readonly shift: number;
  readonly size: number;
  readonly mask: number;
  readonly lastUsedBit: number;
  readonly numValues: number;
  readonly max: number;

  constructor(shift: number, size: number) {
    this.shift = shift;
    this.size = size;
    this.mask = (((1 << shift) << size) - (1 << shift)) >>> 0;
    this.lastUsedBit = shift + size - 1;
    this.numValues = 1 << size;
    this.max = this.numValues - 1;
  }

  next<T2 extends number | boolean>(size2: number): BitField<T2> {
    return new BitField<T2>(this.shift + this.size, size2);
  }

  isValid(value: T): boolean {
    const v = typeof value === "boolean" ? (value ? 1 : 0) : (value as number);
    return (v & ~this.mask) === 0;
  }

  encode(value: T): number {
    const v = typeof value === "boolean" ? (value ? 1 : 0) : (value as number);
    return (v << this.shift) >>> 0;
  }

  update(previous: number, value: T): number {
    return ((previous & ~this.mask) | this.encode(value)) >>> 0;
  }

  decode(value: number): T {
    const result = (value & this.mask) >>> this.shift;
    return result as unknown as T;
  }
}

export function BitField8<T extends number | boolean>(
  shift: number,
  size: number
): BitField<T> {
  return new BitField<T>(shift, size);
}
