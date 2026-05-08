// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { Token, TokenValue } from "./token";

describe("Token", () => {
  describe("TokenValue enum", () => {
    it("should have correct number of tokens", () => {
      expect(TokenValue.kNumTokens).toBe(59);
    });
  });

  describe("Token class", () => {
    it("should have correct token names", () => {
      expect(Token.name(TokenValue.kArrow)).toBe("kArrow");
      expect(Token.name(TokenValue.kLeftParen)).toBe("kLeftParen");
      expect(Token.name(TokenValue.kRightParen)).toBe("kRightParen");
      expect(Token.name(TokenValue.kSkip)).toBe("kSkip");
      expect(Token.name(TokenValue.kIdentifier)).toBe("kIdentifier");
    });

    it("should have correct token strings", () => {
      expect(Token.string(TokenValue.kArrow)).toBe("->");
      expect(Token.string(TokenValue.kLeftParen)).toBe("(");
      expect(Token.string(TokenValue.kSkip)).toBe("skip");
      expect(Token.string(TokenValue.kNumber)).toBe(undefined);
      expect(Token.string(TokenValue.kIdentifier)).toBe(undefined);
    });

    it("should have correct string lengths", () => {
      expect(Token.stringLength(TokenValue.kArrow)).toBe(2); // '->'
      expect(Token.stringLength(TokenValue.kLeftParen)).toBe(1); // '('
      expect(Token.stringLength(TokenValue.kSkip)).toBe(4); // 'skip'
      expect(Token.stringLength(TokenValue.kNumber)).toBe(0); // undefined
    });

    it("should have correct precedences without IN", () => {
      expect(Token.precedence(TokenValue.kMul, false)).toBe(13);
      expect(Token.precedence(TokenValue.kAdd, false)).toBe(12);
      expect(Token.precedence(TokenValue.kDi, false)).toBe(0); // Special case
      expect(Token.precedence(TokenValue.kAssign, false)).toBe(2);
    });

    it("should have correct precedences with IN", () => {
      expect(Token.precedence(TokenValue.kMul, true)).toBe(13);
      expect(Token.precedence(TokenValue.kAdd, true)).toBe(12);
      expect(Token.precedence(TokenValue.kDi, true)).toBe(10); // Normal precedence
      expect(Token.precedence(TokenValue.kAssign, true)).toBe(2);
    });

    it("should have correct token flags", () => {
      // Keywords should have both IsKeyword and IsPropertyName bits set
      expect(Token.tokenFlags[TokenValue.kSkip]).toBe(3); // 0b11

      // Identifiers should have IsPropertyName bit set
      expect(Token.tokenFlags[TokenValue.kIdentifier]).toBe(2); // 0b10

      // Regular tokens should have no flags
      expect(Token.tokenFlags[TokenValue.kArrow]).toBe(0);
      expect(Token.tokenFlags[TokenValue.kAdd]).toBe(0);
    });

    describe("isAnyIdentifier", () => {
      it("should return true for kIdentifier", () => {
        expect(Token.isAnyIdentifier(TokenValue.kIdentifier)).toBe(true);
      });

      it("should return false for other tokens", () => {
        expect(Token.isAnyIdentifier(TokenValue.kSkip)).toBe(false);
        expect(Token.isAnyIdentifier(TokenValue.kArrow)).toBe(false);
        expect(Token.isAnyIdentifier(TokenValue.kNumber)).toBe(false);
      });
    });
  });
});
