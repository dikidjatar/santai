// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import {
  asciiAlphaToLower,
  isAsciiIdentifier,
  isBinaryDigit,
  isDecimalDigit,
  isHexDigit,
  isInRange,
  isLineTerminator,
  isOctalDigit,
  isStringLiteralLineTerminator,
} from "./utils";

describe("utils", () => {
  describe("isInRange", () => {
    it("should return true for values within the range", () => {
      expect(isInRange(5, 1, 10)).toBe(true);
      expect(isInRange(1, 1, 10)).toBe(true);
      expect(isInRange(10, 1, 10)).toBe(true);
    });

    it("should return false for values outside the range", () => {
      expect(isInRange(0, 1, 10)).toBe(false);
      expect(isInRange(11, 1, 10)).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isInRange(0, 0, 0)).toBe(true);
      expect(isInRange(-1, 0, 0)).toBe(false);
    });
  });

  describe("asciiAlphaToLower", () => {
    it("should convert uppercase ASCII letters to lowercase", () => {
      expect(asciiAlphaToLower(65)).toBe(97); // 'A' -> 'a'
      expect(asciiAlphaToLower(90)).toBe(122); // 'Z' -> 'z'
    });

    it("should leave lowercase letters unchanged", () => {
      expect(asciiAlphaToLower(97)).toBe(97); // 'a'
      expect(asciiAlphaToLower(122)).toBe(122); // 'z'
    });

    it("should leave non-letter characters unchanged", () => {
      expect(asciiAlphaToLower(48)).toBe(48); // '0'
      expect(asciiAlphaToLower(32)).toBe(32); // ' '
    });
  });

  describe("isDecimalDigit", () => {
    it("should return true for decimal digits", () => {
      for (let i = 0x30; i <= 0x39; i++) {
        expect(isDecimalDigit(i)).toBe(true);
      }
    });

    it("should return false for non-decimal digits", () => {
      expect(isDecimalDigit(0x2f)).toBe(false); // '/'
      expect(isDecimalDigit(0x3a)).toBe(false); // ':'
      expect(isDecimalDigit(65)).toBe(false); // 'A'
    });
  });

  describe("isHexDigit", () => {
    it("should return true for decimal digits", () => {
      for (let i = 0x30; i <= 0x39; i++) {
        expect(isHexDigit(i)).toBe(true);
      }
    });

    it("should return true for lowercase hex letters", () => {
      for (let i = 0x61; i <= 0x66; i++) {
        expect(isHexDigit(i)).toBe(true);
      }
    });

    it("should return true for uppercase hex letters", () => {
      for (let i = 0x41; i <= 0x46; i++) {
        expect(isHexDigit(i)).toBe(true);
      }
    });

    it("should return false for non-hex characters", () => {
      expect(isHexDigit(0x47)).toBe(false); // 'G'
      expect(isHexDigit(0x60)).toBe(false); // '`'
      expect(isHexDigit(32)).toBe(false); // ' '
    });
  });

  describe("isBinaryDigit", () => {
    it("should return true for 0 and 1", () => {
      expect(isBinaryDigit(0x30)).toBe(true); // '0'
      expect(isBinaryDigit(0x31)).toBe(true); // '1'
    });

    it("should return false for other digits", () => {
      expect(isBinaryDigit(0x32)).toBe(false); // '2'
      expect(isBinaryDigit(65)).toBe(false); // 'A'
    });
  });

  describe("isOctalDigit", () => {
    it("should return true for octal digits 0-7", () => {
      for (let i = 0x30; i <= 0x37; i++) {
        expect(isOctalDigit(i)).toBe(true);
      }
    });

    it("should return false for digits 8-9", () => {
      expect(isOctalDigit(0x38)).toBe(false); // '8'
      expect(isOctalDigit(0x39)).toBe(false); // '9'
    });

    it("should return false for non-digits", () => {
      expect(isOctalDigit(65)).toBe(false); // 'A'
    });
  });

  describe("isAsciiIdentifier", () => {
    it("should return true for alphanumeric and underscore", () => {
      expect(isAsciiIdentifier(0x30)).toBe(true); // '0'
      expect(isAsciiIdentifier(0x39)).toBe(true); // '9'
      expect(isAsciiIdentifier(0x41)).toBe(true); // 'A'
      expect(isAsciiIdentifier(0x5a)).toBe(true); // 'Z'
      expect(isAsciiIdentifier(0x61)).toBe(true); // 'a'
      expect(isAsciiIdentifier(0x7a)).toBe(true); // 'z'
      expect(isAsciiIdentifier(0x5f)).toBe(true); // '_'
    });

    it("should return false for non-identifier characters", () => {
      expect(isAsciiIdentifier(0x20)).toBe(false); // ' '
      expect(isAsciiIdentifier(0x21)).toBe(false); // '!'
      expect(isAsciiIdentifier(0x40)).toBe(false); // '@'
    });
  });

  describe("isStringLiteralLineTerminator", () => {
    it("should return true for LF and CR", () => {
      expect(isStringLiteralLineTerminator(0x000a)).toBe(true); // LF
      expect(isStringLiteralLineTerminator(0x000d)).toBe(true); // CR
    });

    it("should return false for other characters", () => {
      expect(isStringLiteralLineTerminator(0x0020)).toBe(false); // ' '
      expect(isStringLiteralLineTerminator(0x0009)).toBe(false); // TAB
    });
  });

  describe("isLineTerminator", () => {
    it("should return true for line terminators", () => {
      expect(isLineTerminator(0x000a)).toBe(true); // LF
      expect(isLineTerminator(0x000d)).toBe(true); // CR
      expect(isLineTerminator(0x2028)).toBe(true); // LS
      expect(isLineTerminator(0x2029)).toBe(true); // PS
    });

    it("should return false for non-line terminators", () => {
      expect(isLineTerminator(0x0020)).toBe(false); // ' '
      expect(isLineTerminator(0x0009)).toBe(false); // TAB
      expect(isLineTerminator(0x0041)).toBe(false); // 'A'
    });
  });
});
