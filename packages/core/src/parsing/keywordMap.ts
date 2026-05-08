// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { isInRange } from "../utils/utils";
import { TokenValue } from "./token";

/**
 * Describes a single Santai language keyword.
 *
 * - `canonical`  : official spelling that is also used as the reference for min/max length.
 * - `token`      : token value returned for the canonical form and all its aliases.
 * - `aliases`    : alternative spellings that are accepted and mapped to the same token.
 *
 * @example
 * { canonical: "benar", token: TokenValue.kKalo, aliases: ["bener"] }
 */
interface KeywordSpec {
  readonly canonical: string;
  readonly token: TokenValue;
  readonly aliases?: readonly string[];
}

const KEYWORD_SPECS: readonly KeywordSpec[] = [
  { canonical: "ambil", token: TokenValue.kAmbil },
  { canonical: "atau", token: TokenValue.kAtau },
  { canonical: "aksi", token: TokenValue.kAksi },
  { canonical: "balikin", token: TokenValue.kBalikin },
  { canonical: "benar", token: TokenValue.kBenarLiteral },
  { canonical: "coba", token: TokenValue.kCoba },
  { canonical: "stop", token: TokenValue.kStop },
  { canonical: "dan", token: TokenValue.kDan },
  { canonical: "dari", token: TokenValue.kDari },
  { canonical: "di", token: TokenValue.kDi, aliases: ["dalam"] },
  { canonical: "gak", token: TokenValue.kNot },
  { canonical: "gue", token: TokenValue.kGue },
  { canonical: "impor", token: TokenValue.kImpor },
  { canonical: "isi", token: TokenValue.kIsi },
  { canonical: "itu", token: TokenValue.kItu },
  { canonical: "kalo", token: TokenValue.kKalo },
  { canonical: "kosong", token: TokenValue.kKosongLiteral },
  { canonical: "lempar", token: TokenValue.kLempar },
  { canonical: "mumpung", token: TokenValue.kMumpung, aliases: ["selama"] },
  { canonical: "tangkap", token: TokenValue.kTangkap },
  { canonical: "tiap", token: TokenValue.kTiap, aliases: ["setiap"] },
  { canonical: "salah", token: TokenValue.kSalahLiteral },
  { canonical: "sebagai", token: TokenValue.kSebagai, aliases: ["alias"] },
  { canonical: "skip", token: TokenValue.kSkip },
  { canonical: "titip", token: TokenValue.kTitip },
  {
    canonical: "yaudah",
    token: TokenValue.kYaudah,
    aliases: ["tapi", "oke", "udahan"],
  },
];

const _ALL_KEYWORD_STRINGS: readonly string[] = KEYWORD_SPECS.flatMap((s) =>
  s.aliases ? [s.canonical, ...s.aliases] : [s.canonical]
);

const MIN_WORD_LENGTH: number = Math.min(
  ..._ALL_KEYWORD_STRINGS.map((s) => s.length)
);
const MAX_WORD_LENGTH: number = Math.max(
  ..._ALL_KEYWORD_STRINGS.map((s) => s.length)
);

export class KeywordMap {
  private static readonly _map: ReadonlyMap<string, TokenValue> =
    KeywordMap._buildMap();

  private static readonly _keywordChars: ReadonlySet<string> = new Set(
    _ALL_KEYWORD_STRINGS.join("")
  );

  /**
   * Retrieves the token for the given string.
   * Returns kIdentifier if not a recognized keyword.
   *
   * @param str - string identifier
   * @param len - length to check (default: str.length)
   */
  public static getToken(str: string, len?: number): TokenValue {
    const length = len ?? str.length;

    if (!isInRange(length, MIN_WORD_LENGTH, MAX_WORD_LENGTH)) {
      return TokenValue.kIdentifier;
    }

    const keyword = len !== undefined ? str.slice(0, len) : str;
    return KeywordMap._map.get(keyword) ?? TokenValue.kIdentifier;
  }

  /**
   * Returns a set of all characters that can appear
   * in keywords (canonical and aliases)
   */
  public static getKeywordChars(): ReadonlySet<string> {
    return KeywordMap._keywordChars;
  }

  private static _buildMap(): Map<string, TokenValue> {
    const map = new Map<string, TokenValue>();

    for (const spec of KEYWORD_SPECS) {
      map.set(spec.canonical, spec.token);

      if (spec.aliases) {
        for (const alias of spec.aliases) {
          if (map.has(alias)) {
            throw new Error(`KeywordMap: duplicate alias name: "${alias}"`);
          }

          map.set(alias, spec.token);
        }
      }
    }

    return map;
  }
}
