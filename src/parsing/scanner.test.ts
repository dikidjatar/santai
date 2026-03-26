// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { CharacterStream, Scanner } from "./scanner";
import { TokenValue } from "./token";

describe("Scanner", () => {
  function createScanner(input: string): Scanner {
    const data = new TextEncoder().encode(input);
    const stream = new CharacterStream(0, data);
    return new Scanner(stream);
  }

  describe("Basic token scanning", () => {
    it("should scan end of input", () => {
      const scanner = createScanner("");
      expect(scanner.next()).toBe(TokenValue.kEos);
    });

    it("should scan single characters", () => {
      const scanner = createScanner("(");
      expect(scanner.next()).toBe(TokenValue.kLeftParen);
      expect(scanner.next()).toBe(TokenValue.kEos);
    });

    it("should scan operators", () => {
      const scanner = createScanner("+-*/%");
      expect(scanner.next()).toBe(TokenValue.kAdd);
      expect(scanner.next()).toBe(TokenValue.kSub);
      expect(scanner.next()).toBe(TokenValue.kMul);
      expect(scanner.next()).toBe(TokenValue.kDiv);
      expect(scanner.next()).toBe(TokenValue.kMod);
      expect(scanner.next()).toBe(TokenValue.kEos);
    });

    it("should scan comparison operators", () => {
      const scanner = createScanner("< > <= >= == !=");
      expect(scanner.next()).toBe(TokenValue.kLessThan);
      expect(scanner.next()).toBe(TokenValue.kGreaterThan);
      expect(scanner.next()).toBe(TokenValue.kLessThanEq);
      expect(scanner.next()).toBe(TokenValue.kGreaterThanEq);
      expect(scanner.next()).toBe(TokenValue.kEq);
      expect(scanner.next()).toBe(TokenValue.kNotEq);
      expect(scanner.next()).toBe(TokenValue.kEos);
    });

    it("should scan logical operators", () => {
      const scanner = createScanner("|| &&");
      expect(scanner.next()).toBe(TokenValue.kAtau);
      expect(scanner.next()).toBe(TokenValue.kDan);
      expect(scanner.next()).toBe(TokenValue.kEos);
    });

    it("should scan assignment", () => {
      const scanner = createScanner("=");
      expect(scanner.next()).toBe(TokenValue.kAssign);
      expect(scanner.next()).toBe(TokenValue.kEos);
    });

    it("should scan punctuation", () => {
      const scanner = createScanner("()[]{},;.");
      expect(scanner.next()).toBe(TokenValue.kLeftParen);
      expect(scanner.next()).toBe(TokenValue.kRightParen);
      expect(scanner.next()).toBe(TokenValue.kLeftBracket);
      expect(scanner.next()).toBe(TokenValue.kRightBracket);
      expect(scanner.next()).toBe(TokenValue.kLeftBrace);
      expect(scanner.next()).toBe(TokenValue.kRightBrace);
      expect(scanner.next()).toBe(TokenValue.kComma);
      expect(scanner.next()).toBe(TokenValue.kSemicolon);
      expect(scanner.next()).toBe(TokenValue.kPeriod);
      expect(scanner.next()).toBe(TokenValue.kEos);
    });
  });

  describe("Keywords", () => {
    it("should scan keywords", () => {
      const keywords = [
        { input: "atau", token: TokenValue.kAtau },
        { input: "aksi", token: TokenValue.kAksi },
        { input: "balikin", token: TokenValue.kBalikin },
        { input: "ambil", token: TokenValue.kAmbil },
        { input: "benar", token: TokenValue.kBenarLiteral },
        { input: "dan", token: TokenValue.kDan },
        { input: "di", token: TokenValue.kDi },
        { input: "gak", token: TokenValue.kNot },
        { input: "salah", token: TokenValue.kSalahLiteral },
        { input: "isi", token: TokenValue.kIsi },
        { input: "kalo", token: TokenValue.kKalo },
        { input: "kosong", token: TokenValue.kKosongLiteral },
        { input: "mumpung", token: TokenValue.kMumpung },
        { input: "tiap", token: TokenValue.kTiap },
        { input: "skip", token: TokenValue.kSkip },
        { input: "tapi", token: TokenValue.kTapi },
        { input: "yaudah", token: TokenValue.kYaudah },
        { input: "titip", token: TokenValue.kTitip },
        { input: "stop", token: TokenValue.kStop },
      ];

      keywords.forEach(({ input, token }) => {
        const scanner = createScanner(input);
        expect(scanner.next()).toBe(token);
        expect(scanner.next()).toBe(TokenValue.kEos);
      });
    });
  });

  describe("Identifiers", () => {
    it("should scan simple identifiers", () => {
      const scanner = createScanner("abc");
      expect(scanner.next()).toBe(TokenValue.kIdentifier);
      expect(scanner.currentLiteral()).toBe("abc");
      expect(scanner.next()).toBe(TokenValue.kEos);
    });

    it("should scan identifiers with underscores", () => {
      const scanner = createScanner("_abc_123");
      expect(scanner.next()).toBe(TokenValue.kIdentifier);
      expect(scanner.currentLiteral()).toBe("_abc_123");
    });

    it("should scan identifiers with numbers", () => {
      const scanner = createScanner("var1");
      expect(scanner.next()).toBe(TokenValue.kIdentifier);
      expect(scanner.currentLiteral()).toBe("var1");
    });
  });

  describe("Numbers", () => {
    it("should scan decimal numbers", () => {
      const scanner = createScanner("123");
      expect(scanner.next()).toBe(TokenValue.kNumber);
      expect(scanner.currentLiteral()).toBe("123");
    });

    it("should scan decimal numbers with separators", () => {
      const scanner = createScanner("1_234_567");
      expect(scanner.next()).toBe(TokenValue.kNumber);
      expect(scanner.currentLiteral()).toBe("1234567");
    });

    it("should scan hexadecimal numbers", () => {
      const scanner = createScanner("0x1A2B");
      expect(scanner.next()).toBe(TokenValue.kNumber);
      expect(scanner.currentLiteral()).toBe("0x1A2B");
    });

    it("should scan binary numbers", () => {
      const scanner = createScanner("0b1010");
      expect(scanner.next()).toBe(TokenValue.kNumber);
      expect(scanner.currentLiteral()).toBe("0b1010");
    });

    it("should scan octal numbers", () => {
      const scanner = createScanner("0o755");
      expect(scanner.next()).toBe(TokenValue.kNumber);
      expect(scanner.currentLiteral()).toBe("0o755");
    });

    it("should scan floating point numbers", () => {
      const scanner = createScanner("123.456");
      expect(scanner.next()).toBe(TokenValue.kNumber);
      expect(scanner.currentLiteral()).toBe("123.456");
    });

    it("should scan scientific notation", () => {
      const scanner = createScanner("1.23e-4");
      expect(scanner.next()).toBe(TokenValue.kNumber);
      expect(scanner.currentLiteral()).toBe("1.23e-4");
    });

    it("should handle invalid numbers", () => {
      const scanner = createScanner("0_");
      expect(scanner.next()).toBe(TokenValue.kIllegal);
    });
  });

  describe("Strings", () => {
    it("should scan simple strings", () => {
      const scanner = createScanner('"hello"');
      expect(scanner.next()).toBe(TokenValue.kString);
      expect(scanner.currentLiteral()).toBe("hello");
    });

    it("should scan strings with single quotes", () => {
      const scanner = createScanner("'world'");
      expect(scanner.next()).toBe(TokenValue.kString);
      expect(scanner.currentLiteral()).toBe("world");
    });

    it("should scan strings with escape sequences", () => {
      const scanner = createScanner('"hello\\nworld"');
      expect(scanner.next()).toBe(TokenValue.kString);
      expect(scanner.currentLiteral()).toBe("hello\nworld");
    });

    it("should handle unterminated strings", () => {
      const scanner = createScanner('"hello');
      expect(scanner.next()).toBe(TokenValue.kIllegal);
    });
  });

  describe("Whitespace and comments", () => {
    it("should skip whitespace", () => {
      const scanner = createScanner("  \t\n  abc");
      expect(scanner.next()).toBe(TokenValue.kIdentifier);
      expect(scanner.currentLiteral()).toBe("abc");
    });

    it("should skip comments", () => {
      const scanner = createScanner("# this is a comment\nabc");
      expect(scanner.next()).toBe(TokenValue.kIdentifier);
      expect(scanner.currentLiteral()).toBe("abc");
    });
  });

  describe("Peek functionality", () => {
    it("should peek next token without advancing", () => {
      const scanner = createScanner("abc def");
      expect(scanner.peek()).toBe(TokenValue.kIdentifier);
      expect(scanner.next()).toBe(TokenValue.kIdentifier);
      expect(scanner.currentLiteral()).toBe("abc");
      expect(scanner.next()).toBe(TokenValue.kIdentifier);
      expect(scanner.currentLiteral()).toBe("def");
    });
  });

  describe("Error handling", () => {
    it("should report errors for invalid tokens", () => {
      const scanner = createScanner("@");
      expect(scanner.next()).toBe(TokenValue.kIllegal);
    });

    it("should handle invalid number formats", () => {
      const scanner = createScanner("0xG");
      expect(scanner.next()).toBe(TokenValue.kIllegal);
    });
  });

  describe("Location tracking", () => {
    it("should track token locations", () => {
      const scanner = createScanner("abc");
      scanner.next();
      const loc = scanner.location();
      expect(loc.beginPos).toBe(0);
      expect(loc.endPos).toBe(3);
      expect(loc.length()).toBe(3);
    });
  });
});
