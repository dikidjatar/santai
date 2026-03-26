// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

export const enum Chars {
  EndOfInput = 0xffffffff,

  // Control & Whitespace
  Null = 0x00,
  Tab = 0x09, // \t
  LineFeed = 0x0a, // \n
  VerticalTab = 0x0b, // \v
  FormFeed = 0x0c, // \f
  CarriageReturn = 0x0d, // \r
  Space = 0x20,

  // Punctuation & Symbols
  Exclamation = 0x21, // !
  DoubleQuote = 0x22, // "
  Hash = 0x23, // #
  Dollar = 0x24, // $
  Percent = 0x25, // %
  Ampersand = 0x26, // &
  SingleQuote = 0x27, // '
  ParenLeft = 0x28, // (
  ParenRight = 0x29, // )
  Star = 0x2a, // *
  Plus = 0x2b, // +
  Comma = 0x2c, // ,
  Minus = 0x2d, // -
  Dot = 0x2e, // .
  Slash = 0x2f, // /

  // Colon & Comparisons
  Colon = 0x3a, // :
  Semicolon = 0x3b, // ;
  LessThan = 0x3c, // <
  Assign = 0x3d, // =
  GreaterThan = 0x3e, // >
  Question = 0x3f, // ?
  At = 0x40, // @

  // Brackets
  BracketLeft = 0x5b, // [
  Backslash = 0x5c, // \
  BracketRight = 0x5d, // ]
  Caret = 0x5e, // ^
  Underscore = 0x5f, // _
  Backtick = 0x60, // `
  BraceLeft = 0x7b, // {
  Pipe = 0x7c, // |
  BraceRight = 0x7d, // }
  Tilde = 0x7e, // ~

  // Numbers 0-9
  Zero = 0x30,
  One,
  Two,
  Three,
  Four,
  Five,
  Six,
  Seven,
  Eight,
  Nine,

  // Letters Lower
  LowerA = 0x61,
  LowerB,
  LowerC,
  LowerD,
  LowerE,
  LowerF,
  LowerG,
  LowerH,
  LowerI,
  LowerJ,
  LowerK,
  LowerL,
  LowerM,
  LowerN,
  LowerO,
  LowerP,
  LowerQ,
  LowerR,
  LowerS,
  LowerT,
  LowerU,
  LowerV,
  LowerW,
  LowerX,
  LowerY,
  LowerZ,

  // Letters Upper
  UpperA = 0x41,
  UpperB,
  UpperC,
  UpperD,
  UpperE,
  UpperF,
  UpperG,
  UpperH,
  UpperI,
  UpperJ,
  UpperK,
  UpperL,
  UpperM,
  UpperN,
  UpperO,
  UpperP,
  UpperQ,
  UpperR,
  UpperS,
  UpperT,
  UpperU,
  UpperV,
  UpperW,
  UpperX,
  UpperY,
  UpperZ,
}
