// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { MessageTemplate } from "../base/messageTemplate";
import { decodeUtf8CodePoint } from "../utils/decode";
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
} from "../utils/utils";
import { Chars } from "./chars";
import { KeywordMap } from "./keywordMap";
import { TokenValue } from "./token";

/**
 * Represents a stream of characters for parsing purposes.
 * It maintains an internal buffer for performance optimization
 * and tracks the current position within the stream.
 */
export class CharacterStream {
  static readonly kEndOfInput: number = 0xffffffff;

  private readonly data: Uint8Array;
  private readonly length: number;

  private bufferCursor: number = 0;
  private bufferEnd: number = 0;

  private static readonly kBufferSize = 512;
  private buffer: Uint32Array = new Uint32Array(CharacterStream.kBufferSize);

  private readonly byteOffsets: Uint32Array = new Uint32Array(
    CharacterStream.kBufferSize
  );

  private endByteOffset: number;

  constructor(pos: number, data: Uint8Array) {
    this.endByteOffset = pos;
    this.data = data;
    this.length = data.length;
  }

  peek(): number {
    if (this.bufferCursor < this.bufferEnd) {
      return this.buffer[this.bufferCursor];
    }

    if (this.readBlock(this.pos())) {
      return this.buffer[this.bufferCursor];
    }

    return CharacterStream.kEndOfInput;
  }

  advance(): number {
    const result = this.peek();
    this.bufferCursor++;
    return result;
  }

  pos(): number {
    if (this.bufferCursor < this.bufferEnd) {
      return this.byteOffsets[this.bufferCursor];
    }

    // return this.endByteOffset;
    return this.endByteOffset + (this.bufferCursor - this.bufferEnd);
  }

  getRawData(): Uint8Array {
    return this.data;
  }

  /**
   * Advances through the character stream until a character matching the given check function is found.
   * @param check - A predicate function that returns true when the desired character is found.
   * @returns The character code that matched the check function, or {@link CharacterStream.kEndOfInput} if the end of input is reached.
   */
  advanceUntil(check: (c: number) => boolean): number {
    while (true) {
      let found = -1;

      for (let i = this.bufferCursor; i < this.bufferEnd; i++) {
        if (check(this.buffer[i])) {
          found = i;
          break;
        }
      }

      if (found === -1) {
        this.bufferCursor = this.bufferEnd;
        if (!this.readBlock(this.pos())) {
          this.bufferCursor++;
          return CharacterStream.kEndOfInput;
        }
      } else {
        this.bufferCursor = found + 1;
        return this.buffer[found];
      }
    }
  }

  /**
   * Reads a block of characters from the data source into the buffer.
   * @param position - The position in the data source to start reading from
   * @returns `true` if data was successfully read into the buffer, `false` if no data is available
   */
  private readBlock(position: number): boolean {
    this.bufferCursor = 0;

    const from = Math.min(this.length, position);
    if (from >= this.length) {
      this.bufferEnd = 0;
      this.endByteOffset = from;
      return false;
    }

    let bytePos = from;
    let bufIdx = 0;

    while (bufIdx < CharacterStream.kBufferSize && bytePos < this.length) {
      const { codePoint, byteWidth } = decodeUtf8CodePoint(
        this.data,
        bytePos,
        this.length
      );

      if (byteWidth === 0) {
        break;
      }

      this.byteOffsets[bufIdx] = bytePos;
      this.buffer[bufIdx++] = codePoint;
      bytePos += byteWidth;
    }

    this.bufferEnd = bufIdx;
    this.endByteOffset = bytePos;
    return bufIdx > 0;
  }
}

export interface ScannerLocation {
  beginPos: number;
  endPos: number;
  length(): number;
}

export function makeLocation(begin: number, end: number): ScannerLocation {
  return {
    beginPos: begin,
    endPos: end,
    length() {
      return this.endPos - this.beginPos;
    },
  };
}

const enum NumberKind {
  DECIMAL,
  HEX,
  BINARY,
  OCTAL,
}

/**
 * Describes a token scanned from source code.
 */
interface TokenDesc {
  token: TokenValue;
  literalChars: string;
  location: ScannerLocation;
  numberKind: NumberKind;
  afterLineTerminator: boolean;
}

function makeTokenDesc(): TokenDesc {
  return {
    token: TokenValue.kUninitialized,
    literalChars: "",
    location: makeLocation(0, 0),
    numberKind: NumberKind.DECIMAL,
    afterLineTerminator: false,
  };
}

const KEYWORD_CHARS: ReadonlySet<string> = KeywordMap.getKeywordChars();

function canBeKeywordCharacter(c: number): boolean {
  return KEYWORD_CHARS.has(String.fromCharCode(c));
}

function isIdentifierStart(c: number): boolean {
  return (
    isInRange(asciiAlphaToLower(c), Chars.LowerA, Chars.LowerZ) ||
    c === Chars.Underscore
  );
}

function isWhiteSpace(c: number): boolean {
  return c === 0x0020 || c === 0x0009 || c === 0x000b || c === 0x000c;
}

function isWhiteSpaceOrLineTerminator(c: number): boolean {
  return isWhiteSpace(c) || isLineTerminator(c);
}

/**
 * Returns the token for a single ASCII character.
 */
function getOneCharToken(c: number): TokenValue {
  switch (c) {
    case Chars.ParenLeft:
      return TokenValue.kLeftParen;
    case Chars.ParenRight:
      return TokenValue.kRightParen;
    case Chars.BraceLeft:
      return TokenValue.kLeftBrace;
    case Chars.BraceRight:
      return TokenValue.kRightBrace;
    case Chars.Colon:
      return TokenValue.kColon;
    case Chars.BracketLeft:
      return TokenValue.kLeftBracket;
    case Chars.BracketRight:
      return TokenValue.kRightBracket;
    case Chars.Comma:
      return TokenValue.kComma;
    case Chars.Semicolon:
      return TokenValue.kSemicolon;
    case Chars.Dot:
      return TokenValue.kPeriod;
    case Chars.Exclamation:
      return TokenValue.kNot;
    case Chars.LessThan:
      return TokenValue.kLessThan;
    case Chars.GreaterThan:
      return TokenValue.kGreaterThan;
    case Chars.Percent:
      return TokenValue.kMod;
    case Chars.Assign:
      return TokenValue.kAssign;
    case Chars.Plus:
      return TokenValue.kAdd;
    case Chars.Minus:
      return TokenValue.kSub;
    case Chars.Star:
      return TokenValue.kMul;
    case Chars.Slash:
      return TokenValue.kDiv;
    case Chars.Pipe:
      return TokenValue.kAtau;
    case Chars.Ampersand:
      return TokenValue.kDan;
    case Chars.Hash:
      return TokenValue.kComment;
    case Chars.DoubleQuote:
      return TokenValue.kTemplateHead;
    case Chars.SingleQuote:
      return TokenValue.kString;
    case Chars.Space:
    case Chars.Tab:
    case Chars.LineFeed:
    case Chars.CarriageReturn:
    case Chars.VerticalTab:
    case Chars.FormFeed:
      return TokenValue.kWhitespace;

    default: {
      if (isDecimalDigit(c)) {
        return TokenValue.kNumber;
      }

      if (isAsciiIdentifier(c)) {
        return TokenValue.kIdentifier;
      }

      return TokenValue.kIllegal;
    }
  }
}

export class Scanner {
  static readonly kEndOfInput = CharacterStream.kEndOfInput;
  private static readonly kMaxAscii = 127;

  // Slot TokenDesc
  private readonly tokenStorage: [TokenDesc, TokenDesc, TokenDesc, TokenDesc] =
    [makeTokenDesc(), makeTokenDesc(), makeTokenDesc(), makeTokenDesc()];

  private currentIdx: number = 0; // index to tokenStorage
  private nextIdx: number = 1;
  private nextNextIdx: number = 2;
  private nextNextNextIdx: number = 3;

  private readonly source: CharacterStream;
  private c0: number = 0;

  private scannerError: MessageTemplate = MessageTemplate.kNone;

  private _pendingTemplateContinuation: boolean = false;

  constructor(source: CharacterStream) {
    this.source = source;
    this.advance();
    this.getNext().afterLineTerminator = true;
    this.scan(this.nextIdx);
  }

  prepareTemplateContinuation(): void {
    this._pendingTemplateContinuation = true;
  }

  next(): TokenValue {
    const previousIdx = this.currentIdx;
    this.currentIdx = this.nextIdx;

    if (this.getNextNext().token === TokenValue.kUninitialized) {
      this.nextIdx = previousIdx;
      this.tokenStorage[previousIdx].afterLineTerminator = false;
      this.scan(previousIdx);
    } else {
      this.nextIdx = this.nextNextIdx;

      if (this.getNextNextNext().token === TokenValue.kUninitialized) {
        this.nextNextIdx = previousIdx;
      } else {
        this.nextNextIdx = this.nextNextNextIdx;
        this.nextNextNextIdx = previousIdx;
      }

      this.tokenStorage[previousIdx].token = TokenValue.kUninitialized;
    }

    return this.getCurrent().token;
  }

  location(): ScannerLocation {
    return this.getCurrent().location;
  }

  peek(): TokenValue {
    return this.getNext().token;
  }

  peekAhead(): TokenValue {
    if (this.getNextNext().token !== TokenValue.kUninitialized) {
      return this.getNextNext().token;
    }

    const tempIdx = this.nextIdx;
    this.nextIdx = this.nextNextIdx;
    this.getNext().afterLineTerminator = false;
    this.scan(this.nextIdx);
    this.nextNextIdx = this.nextIdx;
    this.nextIdx = tempIdx;

    return this.getNextNext().token;
  }

  peekLocation(): ScannerLocation {
    return this.getNext().location;
  }

  hasError(): boolean {
    return this.scannerError !== MessageTemplate.kNone;
  }

  error(): MessageTemplate {
    return this.scannerError;
  }

  hasLineTerminator(): boolean {
    return this.getNext().afterLineTerminator;
  }

  currentLiteral(): string {
    return this.getCurrent().literalChars;
  }

  numberValue(): number {
    const current = this.getCurrent();
    return Number(current.literalChars);
  }

  private getCurrent(): TokenDesc {
    return this.tokenStorage[this.currentIdx];
  }
  private getNext(): TokenDesc {
    return this.tokenStorage[this.nextIdx];
  }
  private getNextNext(): TokenDesc {
    return this.tokenStorage[this.nextNextIdx];
  }
  private getNextNextNext(): TokenDesc {
    return this.tokenStorage[this.nextNextNextIdx];
  }

  private advance(): void {
    this.c0 = this.source.advance();
  }
  private advanceUntil(check: (c: number) => boolean): void {
    this.c0 = this.source.advanceUntil(check);
  }

  private addLiteralChar(c: number): void {
    this.getNext().literalChars += String.fromCodePoint(c);
  }
  private addLiteralCharAdvance(): void {
    this.addLiteralChar(this.c0);
    this.advance();
  }

  private sourcePos(): number {
    return this.source.pos() - 1;
  }

  private select(tok: TokenValue): TokenValue;
  private select(next: number, then: TokenValue, else_: TokenValue): TokenValue;
  private select(
    tokOrNext: TokenValue | number,
    then?: TokenValue,
    else_?: TokenValue
  ): TokenValue {
    this.advance();

    if (then !== undefined) {
      if (this.c0 === tokOrNext) {
        this.advance();
        return then;
      }
      return else_!;
    }

    return tokOrNext as TokenValue;
  }

  private scan(descIdx: number): void {
    if (this._pendingTemplateContinuation) {
      this._pendingTemplateContinuation = false;
      this.tokenStorage[descIdx].token = this.scanTemplateChunk();
    } else {
      this.tokenStorage[descIdx].token = this.scanSingleToken();
    }
    this.tokenStorage[descIdx].location.endPos = this.sourcePos();
  }

  private scanSingleToken(): TokenValue {
    let token: TokenValue;

    do {
      this.getNext().location.beginPos = this.sourcePos();

      if (this.c0 <= Scanner.kMaxAscii) {
        token = getOneCharToken(this.c0);

        switch (token) {
          case TokenValue.kLeftParen:
          case TokenValue.kRightParen:
          case TokenValue.kLeftBrace:
          case TokenValue.kRightBrace:
          case TokenValue.kLeftBracket:
          case TokenValue.kRightBracket:
          case TokenValue.kColon:
          case TokenValue.kSemicolon:
          case TokenValue.kComma:
          case TokenValue.kAdd:
          case TokenValue.kDiv:
          case TokenValue.kMod:
          case TokenValue.kIllegal:
            return this.select(token);

          case TokenValue.kSub: {
            return this.select(
              Chars.GreaterThan,
              TokenValue.kArrow,
              TokenValue.kSub
            );
          }

          case TokenValue.kLessThan:
            return this.select(
              Chars.Assign,
              TokenValue.kLessThanEq,
              TokenValue.kLessThan
            );

          case TokenValue.kGreaterThan:
            return this.select(
              Chars.Assign,
              TokenValue.kGreaterThanEq,
              TokenValue.kGreaterThan
            );

          case TokenValue.kAssign:
            return this.select(
              Chars.Assign,
              TokenValue.kEq,
              TokenValue.kAssign
            );

          case TokenValue.kNot:
            return this.select(
              Chars.Assign,
              TokenValue.kNotEq,
              TokenValue.kNot
            );

          case TokenValue.kMul:
            return this.select(Chars.Star, TokenValue.kExp, TokenValue.kMul);

          case TokenValue.kAtau: {
            this.advance();
            if (this.c0 === Chars.Pipe) {
              return this.select(TokenValue.kAtau);
            }
            return TokenValue.kAtau;
          }

          case TokenValue.kDan: {
            this.advance();
            if (this.c0 === Chars.Ampersand) {
              return this.select(TokenValue.kDan);
            }
            return TokenValue.kDan;
          }

          case TokenValue.kPeriod: {
            this.advance();
            if (isDecimalDigit(this.c0)) {
              return this.scanNumber(true);
            }
            return TokenValue.kPeriod;
          }

          case TokenValue.kTemplateHead:
            return this.scanTemplateLiteral();

          case TokenValue.kString:
            return this.scanString();

          case TokenValue.kNumber:
            return this.scanNumber(false);

          case TokenValue.kWhitespace:
            token = this.skipWhiteSpace();
            continue;

          case TokenValue.kComment:
            token = this.skipComment();
            continue;

          case TokenValue.kIdentifier:
            return this.scanIdentifier();

          default:
            break;
        }
      }

      if (isIdentifierStart(this.c0)) {
        return this.scanIdentifier();
      }

      if (this.c0 === CharacterStream.kEndOfInput) {
        return TokenValue.kEos;
      }

      token = this.skipWhiteSpace();
    } while (token === TokenValue.kWhitespace);

    return token;
  }

  private skipWhiteSpace(): TokenValue {
    if (!isWhiteSpaceOrLineTerminator(this.c0)) {
      return TokenValue.kIllegal;
    }

    if (!this.getNext().afterLineTerminator && isLineTerminator(this.c0)) {
      this.getNext().afterLineTerminator = true;
    }

    let hint = 0x20; // ' '
    this.advanceUntil((c: number) => {
      if (c === hint) {
        return false;
      }

      if (isWhiteSpaceOrLineTerminator(c)) {
        if (!this.getNext().afterLineTerminator && isLineTerminator(c)) {
          this.getNext().afterLineTerminator = true;
        }

        hint = c;
        return false;
      }

      return true;
    });

    return TokenValue.kWhitespace;
  }

  private skipComment(): TokenValue {
    this.advanceUntil((c: number) => isLineTerminator(c));
    return TokenValue.kWhitespace;
  }

  private scanIdentifier(): TokenValue {
    let canBeKeyword = true;
    this.getNext().literalChars = "";

    if (this.c0 <= Scanner.kMaxAscii) {
      this.addLiteralChar(this.c0);
      this.advanceUntil((c: number) => {
        if (!isAsciiIdentifier(c)) {
          return true;
        }
        this.addLiteralChar(c);
        return false;
      });

      canBeKeyword = !(
        isAsciiIdentifier(this.c0) && !canBeKeywordCharacter(this.c0)
      );
    }

    if (canBeKeyword) {
      const chars = this.getNext().literalChars;
      return KeywordMap.getToken(chars, chars.length);
    }

    return TokenValue.kIdentifier;
  }

  private scanNumber(period: boolean): TokenValue {
    let kind: NumberKind = NumberKind.DECIMAL;
    this.getNext().literalChars = "";

    if (period) {
      this.addLiteralChar(Chars.Dot);

      if (this.c0 === Chars.Underscore) {
        return TokenValue.kIllegal;
      }

      if (!this.scanDecimalDigits(true)) {
        return TokenValue.kIllegal;
      }
    } else {
      if (this.c0 === Chars.Zero) {
        this.addLiteralCharAdvance();
        const lower = asciiAlphaToLower(this.c0);

        if (lower === Chars.LowerX) {
          this.addLiteralCharAdvance();
          kind = NumberKind.HEX;

          if (!this.scanHexDigits()) {
            return TokenValue.kIllegal;
          }
        } else if (lower === Chars.LowerB) {
          this.addLiteralCharAdvance();
          kind = NumberKind.BINARY;

          if (!this.scanBinaryDigits()) {
            return TokenValue.kIllegal;
          }
        } else if (lower === Chars.LowerO) {
          this.addLiteralCharAdvance();
          kind = NumberKind.OCTAL;

          if (!this.scanOctalDigits()) {
            return TokenValue.kIllegal;
          }
        } else if ((this.c0 as number) === Chars.Underscore) {
          this.reportScannerError(MessageTemplate.kZeroDigitNumericSeparator);
          return TokenValue.kIllegal;
        }
      }
    }

    if (kind === NumberKind.DECIMAL) {
      if (!this.scanDecimalDigits(true)) {
        return TokenValue.kIllegal;
      }

      if (this.c0 === Chars.Dot) {
        period = true;
        this.addLiteralCharAdvance();

        if ((this.c0 as number) !== Chars.Underscore) {
          if (!this.scanDecimalDigits(true)) {
            return TokenValue.kIllegal;
          }
        }
      }
    }

    if (asciiAlphaToLower(this.c0) === Chars.LowerE) {
      if (kind !== NumberKind.DECIMAL) {
        return TokenValue.kIllegal;
      }

      this.addLiteralCharAdvance();

      if (this.c0 === Chars.Plus || this.c0 === Chars.Minus) {
        this.addLiteralCharAdvance();
      }

      if (!isDecimalDigit(this.c0) || !this.scanDecimalDigits(true)) {
        return TokenValue.kIllegal;
      }
    }

    if (isDecimalDigit(this.c0) || isIdentifierStart(this.c0)) {
      return TokenValue.kIllegal;
    }

    this.getNext().numberKind = kind;
    return TokenValue.kNumber;
  }

  private scanDigits(
    predicate: (c: number) => boolean,
    firstDigit: boolean
  ): boolean {
    if (firstDigit && !predicate(this.c0)) {
      return false;
    }

    let sepSeen = false;

    while (predicate(this.c0) || this.c0 === Chars.Underscore) {
      if (this.c0 === Chars.Underscore) {
        this.advance();
        if (this.c0 === Chars.Underscore) {
          this.reportScannerError(MessageTemplate.kInvalidNumericSeparator);
          return false;
        }
        sepSeen = true;
        continue;
      }

      sepSeen = false;
      this.addLiteralCharAdvance();
    }

    if (sepSeen) {
      this.reportScannerError(MessageTemplate.kTrailingNumericSeparator);
      return false;
    }

    return true;
  }

  private scanDecimalDigits(allowSeparator = true): boolean {
    if (allowSeparator) {
      return this.scanDigits(isDecimalDigit, false);
    }

    while (isDecimalDigit(this.c0)) {
      this.addLiteralCharAdvance();
    }

    if (this.c0 === Chars.Underscore) {
      this.reportScannerError(MessageTemplate.kInvalidOrUnexpectedToken);
      return false;
    }

    return true;
  }

  private scanHexDigits(): boolean {
    return this.scanDigits(isHexDigit, true);
  }
  private scanBinaryDigits(): boolean {
    return this.scanDigits(isBinaryDigit, true);
  }
  private scanOctalDigits(): boolean {
    return this.scanDigits(isOctalDigit, true);
  }

  private scanString(): TokenValue {
    const quote = this.c0;
    this.getNext().literalChars = "";

    while (true) {
      this.advanceUntil((c: number) => {
        if (c > Scanner.kMaxAscii) {
          if (isStringLiteralLineTerminator(c)) {
            return true;
          }

          this.addLiteralChar(c);
          return false;
        }

        if (
          c === quote ||
          isStringLiteralLineTerminator(c) ||
          c === Chars.Backslash
        ) {
          return true;
        }

        this.addLiteralChar(c);
        return false;
      });

      while (this.c0 === Chars.Backslash) {
        this.advance();
        if (this.c0 === CharacterStream.kEndOfInput || !this.scanEscape()) {
          return TokenValue.kIllegal;
        }
      }

      if (this.c0 === quote) {
        this.advance();
        return TokenValue.kString;
      }

      if (
        this.c0 === CharacterStream.kEndOfInput ||
        isStringLiteralLineTerminator(this.c0)
      ) {
        return TokenValue.kIllegal;
      }

      this.addLiteralChar(this.c0);
    }
  }

  private scanTemplateLiteral(): TokenValue {
    this.getNext().literalChars = "";
    this.advance();
    return this.scanTemplateSegment(
      TokenValue.kString,
      TokenValue.kTemplateHead
    );
  }

  private scanTemplateChunk(): TokenValue {
    this.getNext().literalChars = "";
    return this.scanTemplateSegment(
      TokenValue.kTemplateTail,
      TokenValue.kTemplateMiddle
    );
  }

  private scanTemplateSegment(
    closingToken: TokenValue,
    interiorToken: TokenValue
  ): TokenValue {
    while (true) {
      if (this.c0 === Chars.DoubleQuote) {
        this.advance();
        return closingToken;
      }

      if (this.c0 === Chars.BraceLeft) {
        this.advance();
        return interiorToken;
      }

      if (
        this.c0 === CharacterStream.kEndOfInput ||
        isStringLiteralLineTerminator(this.c0)
      ) {
        this.reportScannerError(MessageTemplate.kUnterminatedTemplate);
        return TokenValue.kIllegal;
      }

      if (this.c0 === Chars.Backslash) {
        this.advance();
        if (this.c0 === CharacterStream.kEndOfInput || !this.scanEscape()) {
          return TokenValue.kIllegal;
        }
        continue;
      }

      this.addLiteralChar(this.c0);
      this.scanTemplateLiteralCharsAdvanceUntil();
    }
  }

  private scanTemplateLiteralCharsAdvanceUntil(): void {
    this.advanceUntil((c: number) => {
      if (c > Scanner.kMaxAscii) {
        if (isStringLiteralLineTerminator(c)) return true;
        this.addLiteralChar(c);
        return false;
      }
      if (
        c === Chars.DoubleQuote ||
        c === Chars.BraceLeft ||
        isStringLiteralLineTerminator(c) ||
        c === Chars.Backslash
      ) {
        return true;
      }
      this.addLiteralChar(c);
      return false;
    });
  }

  private scanEscape(): boolean {
    const c0 = this.c0;
    this.advance();

    if (isLineTerminator(c0)) {
      if (c0 === 0x000d && this.c0 === 0x000a) {
        this.advance();
      }
      return true;
    }

    let result: number = c0;

    switch (c0) {
      case Chars.LowerB:
        result = 0x08;
        break;
      case Chars.LowerF:
        result = 0x0c;
        break;
      case Chars.LowerN:
        result = 0x0a;
        break;
      case Chars.LowerR:
        result = 0x0d;
        break;
      case Chars.LowerT:
        result = 0x09;
        break;
      case Chars.LowerU:
        return false;
      case Chars.LowerV:
        result = 0x0b;
        break;
      case Chars.LowerX: {
        let x = 0;

        for (let i = 0; i < 2; i++) {
          let c2 = this.c0 - 0x30;
          let d = -1;

          if (c2 >= 0 && c2 <= 9) {
            d = c2;
          } else {
            c2 = (this.c0 | 0x20) - 0x61;
            if (c2 >= 0 && c2 <= 5) {
              d = c2 + 10;
            }
          }

          if (d < 0) {
            return false;
          }

          x = x * 16 + d;
          this.advance();
        }

        result = x;
        break;
      }

      case Chars.Zero:
      case Chars.One:
      case Chars.Two:
      case Chars.Three:
      case Chars.Four:
      case Chars.Five:
      case Chars.Six:
      case Chars.Seven: {
        let x = c0 - 0x30;

        for (let i = 0; i < 2; i++) {
          const d = this.c0 - 0x30;
          if (d < 0 || d > 7) {
            break;
          }

          const nx = x * 8 + d;
          if (nx > 256) {
            break;
          }

          x = nx;
          this.advance();
        }

        result = x;
        break;
      }
    }

    this.addLiteralChar(result);
    return true;
  }

  private reportScannerError(error: MessageTemplate): void {
    if (this.hasError()) {
      return;
    }

    this.scannerError = error;
  }
}
