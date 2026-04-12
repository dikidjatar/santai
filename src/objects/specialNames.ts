// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { TokenValue } from "../parsing/token";

export const enum SpecialName {
  // Lifecycle
  __awal__ = "__awal__",

  // Coercions
  __teks__ = "__teks__",
  __logika__ = "__logika__",
  __angka__ = "__angka__",
  __panjang__ = "__panjang__",

  // Arithmetic operators
  __tambah__ = "__tambah__",
  __kurang__ = "__kurang__",
  __kali__ = "__kali__",
  __bagi__ = "__bagi__",
  __modulus__ = "__modulus__",
  __pangkat__ = "__pangkat__",

  // Reflected arithmetic (called on RIGHT operand when left has no method)
  __rtambah__ = "__rtambah__",
  __rkurang___ = "__rkurang___",
  __rkali__ = "__rkali__",
  __rbagi__ = "__rbagi__",
  __rmodulus__ = "__rmodulus__",
  __rpangkat__ = "__rpangkat__",

  // Comparison
  __sama__ = "__sama__",
  __tidaksama__ = "__tidaksama__",
  __kurangdari__ = "__kurangdari__",
  __lebihdari__ = "__lebihdari__",
  __kurangsama__ = "__kurangsama__",
  __lebihsama__ = "__lebihsama__",

  // Container / subscript
  __ambil__ = "__ambil__",
  __atur__ = "__atur__",
  __berisi__ = "__berisi__",

  // Property access
  __ambilproperti__ = "__ambilproperti__",

  // Iteration
  __daftarproperti__ = "__daftarproperti__",
}

export const TokenToSpecialName: Readonly<Record<number, SpecialName>> = {
  [TokenValue.kAdd]: SpecialName.__tambah__,
  [TokenValue.kSub]: SpecialName.__kurang__,
  [TokenValue.kMul]: SpecialName.__kali__,
  [TokenValue.kDiv]: SpecialName.__bagi__,
  [TokenValue.kMod]: SpecialName.__modulus__,
  [TokenValue.kExp]: SpecialName.__pangkat__,
  [TokenValue.kEq]: SpecialName.__sama__,
  [TokenValue.kNotEq]: SpecialName.__tidaksama__,
  [TokenValue.kLessThan]: SpecialName.__kurangdari__,
  [TokenValue.kGreaterThan]: SpecialName.__lebihdari__,
  [TokenValue.kLessThanEq]: SpecialName.__kurangsama__,
  [TokenValue.kGreaterThanEq]: SpecialName.__lebihsama__,
  [TokenValue.kDi]: SpecialName.__berisi__,
};

/**
 * Reflected (right-hand) special name for a binary operator token.
 */
export const ReflectedSpecialName: Readonly<Record<string, SpecialName>> = {
  [SpecialName.__tambah__]: SpecialName.__rtambah__,
  [SpecialName.__kurang__]: SpecialName.__rkurang___,
  [SpecialName.__kali__]: SpecialName.__rkali__,
  [SpecialName.__bagi__]: SpecialName.__rbagi__,
  [SpecialName.__modulus__]: SpecialName.__rmodulus__,
  [SpecialName.__pangkat__]: SpecialName.__rpangkat__,
};
