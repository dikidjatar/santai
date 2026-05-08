// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

const textDecoder = new TextDecoder("utf-8", { fatal: false });

export function decode(data: Uint8Array): string {
  return textDecoder.decode(data);
}

export interface Utf8DecodeResult {
  readonly codePoint: number;
  readonly byteWidth: number;
}

export function decodeUtf8CodePoint(
  data: Uint8Array,
  bytePos: number,
  dataLen: number
): Utf8DecodeResult {
  const b0 = data[bytePos]!;

  if (b0 < 0x80) {
    // 1 byte: ASCII
    return { codePoint: b0, byteWidth: 1 };
  }

  if ((b0 & 0xe0) === 0xc0) {
    // 2 bytes
    if (bytePos + 2 > dataLen) {
      return { codePoint: 0xfffd, byteWidth: 0 };
    }
    return {
      codePoint: ((b0 & 0x1f) << 6) | (data[bytePos + 1]! & 0x3f),
      byteWidth: 2,
    };
  }

  if ((b0 & 0xf0) === 0xe0) {
    // 3 bytes
    if (bytePos + 3 > dataLen) {
      return { codePoint: 0xfffd, byteWidth: 0 };
    }
    return {
      codePoint:
        ((b0 & 0x0f) << 12) |
        ((data[bytePos + 1]! & 0x3f) << 6) |
        (data[bytePos + 2]! & 0x3f),
      byteWidth: 3,
    };
  }

  if ((b0 & 0xf8) === 0xf0) {
    if (bytePos + 4 > dataLen) {
      return { codePoint: 0xfffd, byteWidth: 0 };
    }
    return {
      codePoint:
        ((b0 & 0x07) << 18) |
        ((data[bytePos + 1]! & 0x3f) << 12) |
        ((data[bytePos + 2]! & 0x3f) << 6) |
        (data[bytePos + 3]! & 0x3f),
      byteWidth: 4,
    };
  }

  return { codePoint: 0xfffd, byteWidth: 1 };
}
