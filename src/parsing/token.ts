// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { BitField8 } from "../base/bitField";
import { isInRange } from "../utils/utils";

type TokenDef = [
  name: string,
  str: string | undefined,
  precedence: number,
  isKeyword: boolean,
];

const TOKEN_LIST: TokenDef[] = [
  // BEGIN Template
  ["kTemplateHead", undefined, 0, false], // "teks before {"
  ["kTemplateMiddle", undefined, 0, false], // "text between } and {"
  ["kTemplateTail", undefined, 0, false], // "teks after }"
  // END Template

  // BEGIN Property
  ["kPeriod", ".", 0, false],
  ["kLeftBracket", "[", 0, false],
  // END Property
  ["kLeftParen", "(", 0, false],
  ["kRightParen", ")", 0, false],
  ["kRightBracket", "]", 0, false],
  ["kLeftBrace", "{", 0, false],
  ["kColon", ":", 0, false],
  ["kSemicolon", ";", 0, false],
  ["kRightBrace", "}", 0, false],
  // End of source indicator
  ["kEos", "EOS", 0, false],

  ["kArrow", "->", 0, false],

  ["kAssign", "=", 2, false],
  ["kComma", ",", 1, false],

  // BINARY_OP_TOKEN_LIST
  ["kMul", "*", 13, false],
  ["kDiv", "/", 13, false],
  ["kMod", "%", 13, false],
  ["kDan", "dan", 5, false],
  ["kAtau", "atau", 4, false],
  ["kExp", "**", 14, false],
  ["kAdd", "+", 12, false],
  ["kSub", "-", 12, false],

  ["kNot", "!", 0, false],

  // Compare operators
  ["kEq", "==", 9, false],
  ["kNotEq", "!=", 9, false],
  ["kLessThan", "<", 10, false],
  ["kGreaterThan", ">", 10, false],
  ["kLessThanEq", "<=", 10, false],
  ["kGreaterThanEq", ">=", 10, false],
  ["kDi", "di", 10, true],
  ["kItu", "itu", 9, true],

  // Keywords
  ["kSkip", "skip", 0, true],
  ["kTapi", "tapi", 0, true],
  ["kStop", "stop", 0, true],
  ["kYaudah", "yaudah", 0, true],
  ["kTiap", "tiap", 0, true],
  ["kAksi", "aksi", 0, true],
  ["kAmbil", "ambil", 0, true],
  ["kKalo", "kalo", 0, true],
  ["kBalikin", "balikin", 0, true],
  ["kTitip", "titip", 0, true],
  ["kMumpung", "mumpung", 0, true],
  ["kGue", "gue", 0, true],
  ["kCoba", "coba", 0, true],
  ["kTangkap", "tangkap", 0, true],
  ["kLempar", "lempar", 0, true],
  ["kIsi", "isi", 0, true],

  // Literals
  ["kKosongLiteral", "kosong", 0, true],
  ["kBenarLiteral", "benar", 0, true],
  ["kSalahLiteral", "salah", 0, true],
  ["kNumber", undefined, 0, false],
  ["kString", undefined, 0, false],

  // Identifier
  ["kIdentifier", undefined, 0, false],

  ["kComment", "#", 0, false],

  // Illegal
  ["kIllegal", "ILLEGAL", 0, false],
  ["kEscapedKeyword", undefined, 0, false],

  // Internal scanner use
  ["kWhitespace", undefined, 0, false],
  ["kUninitialized", undefined, 0, false],
];

export enum TokenValue {
  // BEGIN Template
  kTemplateHead,
  kTemplateMiddle,
  kTemplateTail,
  // END Template

  // BEGIN Property
  kPeriod,
  kLeftBracket,

  // END Property
  kLeftParen,
  kRightParen,
  kRightBracket,
  kLeftBrace,
  kColon,
  kSemicolon,
  kRightBrace,

  // End of source indicator
  kEos,

  kArrow,

  kAssign,
  kComma,

  // BINARY_OP
  kMul,
  kDiv,
  kMod,
  kDan,
  kAtau,
  kExp,
  kAdd,
  kSub,
  kNot,

  // Compare operators
  kEq,
  kNotEq,
  kLessThan,
  kGreaterThan,
  kLessThanEq,
  kGreaterThanEq,
  kDi,
  kItu,

  // Keywords
  kSkip,
  kTapi,
  kStop,
  kYaudah,
  kTiap,
  kAksi,
  kAmbil,
  kKalo,
  kBalikin,
  kTitip,
  kMumpung,
  kGue,
  kCoba,
  kTangkap,
  kLempar,
  kIsi,

  // Literals
  kKosongLiteral,
  kBenarLiteral,
  kSalahLiteral,
  kNumber,
  kString,

  // Identifier
  kIdentifier,

  kComment,

  // Illegal
  kIllegal,
  kEscapedKeyword,

  // Internal scanner use
  kWhitespace,
  kUninitialized,

  kNumTokens,
}

const IsKeywordBits = BitField8(0, 1);
const IsPropertyNameBits = IsKeywordBits.next<boolean>(1);

export class Token {
  private static readonly _names: string[] = TOKEN_LIST.map(([n]) => n);
  private static readonly _strings: (string | undefined)[] = TOKEN_LIST.map(
    ([, s]) => s
  );
  private static readonly _stringLengths: number[] = TOKEN_LIST.map(
    ([, s]) => s?.length ?? 0
  );

  // precedence_[0] = acceptIN=false  (kDi is treated as 0)
  // precedence_[1] = acceptIN=true
  private static readonly _precedences: [number[], number[]] = (() => {
    const withIn: number[] = TOKEN_LIST.map(([, , p]) => p);
    const withoutIn: number[] = TOKEN_LIST.map(([, , p], i) =>
      i === TokenValue.kDi ? 0 : p
    );
    return [withoutIn, withIn];
  })();

  private static buildTokenFlags(): Uint8Array {
    const flags = new Uint8Array(TokenValue.kNumTokens);

    for (let i = 0; i < TOKEN_LIST.length; i++) {
      const [, , , isKeyword] = TOKEN_LIST[i];
      const isIdentifier =
        this.isAnyIdentifier(i as TokenValue) ||
        i === TokenValue.kEscapedKeyword;

      if (isKeyword) {
        // KK macro: IsKeywordBits | IsPropertyNameBits
        flags[i] = IsKeywordBits.encode(true) | IsPropertyNameBits.encode(true);
      } else {
        // KT macro: IsPropertyNameBits encode isIdentifier
        flags[i] = IsPropertyNameBits.encode(isIdentifier);
      }
    }

    return flags;
  }

  static readonly tokenFlags: Uint8Array = this.buildTokenFlags();

  static name(token: TokenValue): string {
    return Token._names[token];
  }

  static string(token: TokenValue): string | undefined {
    return Token._strings[token];
  }

  static stringLength(token: TokenValue): number {
    return Token._stringLengths[token];
  }

  static isAnyIdentifier(token: TokenValue): boolean {
    return isInRange(token, TokenValue.kIdentifier, TokenValue.kIdentifier);
  }

  static isLiteral(token: TokenValue): boolean {
    return isInRange(token, TokenValue.kKosongLiteral, TokenValue.kString);
  }

  static isAutoSemicolon(token: TokenValue): boolean {
    return isInRange(token, TokenValue.kSemicolon, TokenValue.kEos);
  }

  static isUnaryOp(op: TokenValue): boolean {
    return isInRange(op, TokenValue.kAdd, TokenValue.kNot);
  }

  static isCompareOp(op: TokenValue): boolean {
    return isInRange(op, TokenValue.kEq, TokenValue.kItu);
  }

  static isPropertyOrCall(token: TokenValue): boolean {
    return isInRange(token, TokenValue.kPeriod, TokenValue.kLeftParen);
  }

  static precedence(token: TokenValue, acceptIN: boolean): number {
    return Token._precedences[acceptIN ? 1 : 0][token];
  }
}
