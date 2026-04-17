// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

export const enum MessageTemplate {
  kNone,
  // SyntaxError
  kInvalidNumericSeparator,
  kTrailingNumericSeparator,
  kInvalidOrUnexpectedToken,
  kZeroDigitNumericSeparator,
  kUnexpectedTokenNumber,
  kUnexpectedTokenString,
  kUnexpectedTokenIdentifier,
  kUnexpectedKeywordArgument,
  kUnterminatedTemplate,
  kConstDeclMissingInitialize,
  kVarRedeclaration,
  kInvalidAssignmentTarget,
  kNonDefaultAfterDefault,
  kPositionalAfterNamed,
  kAssignToContantVariable,
  kIllegalReturnStatement,
  kIllegalBreakStatement,
  kIllegalContinueStatement,
  kGueOutsideClass,
  kSyntaxError,
  kUnexpectedEOS,

  // TypeError
  kUnsupportedUnaryOperation,
  kUnsupportedBinaryOperation,
  kMissingArgument,
  kTooManyArguments,
  kIntegerModuleByZero,
  kCalledNoCallable,
  kDivisionByZero,
  kInvaidObjectDescriptor,
  kDuplicateArgument,
  kInvalidReturnValue,
  kNotIterable,
  kCannotSetProperty,
  kTypeError,
  kCannotSetSubscript,
  kCannotGetSubscript,

  // ReferenceError
  kNotDefined,
  kObjectHasNoMember,
  kPropertyNotFound,
}

/**
 * Each error has a "mood" that determines the ANSI color and emoji prefix.
 *
 * | Mood     | Emoji | Color     | Used For                               |
 * |----------|-------|-----------|----------------------------------------|
 * | Marah    | 😤    | Merah     | Wrong type, invalid operation          |
 * | Sedih    | 😢    | Biru      | Missing variable, missing value        |
 * | Panik    | 😱    | Magenta   | Something impossible / unreasonable    |
 * | Bingung  | 🤔    | Kuning    | Strange token, wrong syntax            |
 * | Gila     | 🤪    | Cyan      | Edge-case is like dividing by zero     |
 */
export const enum Mood {
  Marah = 0,
  Sedih = 1,
  Panik = 2,
  Bingung = 3,
  Gila = 4,
}

export const MessageTemplateString: Record<MessageTemplate, string> = {
  [MessageTemplate.kNone]: "",

  // Lexical
  [MessageTemplate.kInvalidNumericSeparator]:
    "underscore pemisah angka gak boleh nongol di sini",
  [MessageTemplate.kTrailingNumericSeparator]:
    "jangan taruh underscore di ujung angka, nanggung banget",
  [MessageTemplate.kInvalidOrUnexpectedToken]:
    "karakter ini muncul disin? gue bingung",
  [MessageTemplate.kZeroDigitNumericSeparator]:
    "underscore gak boleh langsung nempel setelah nol di depan",

  // Parsing
  [MessageTemplate.kUnexpectedTokenNumber]:
    "angka muncul di sini? salah tempat, bro",
  [MessageTemplate.kUnexpectedTokenString]:
    "teks muncul di sini? salah tempat, bro",
  [MessageTemplate.kUnexpectedTokenIdentifier]:
    "gak expect '%s' di sini, gue bingung",
  [MessageTemplate.kUnexpectedEOS]:
    "kode udah habis tapi kayak belum kelar — kurang apa nih?",
  [MessageTemplate.kUnexpectedKeywordArgument]:
    "'%s' bukan nama parameter yang valid di aksi '%s' — lo yakin beneran ada?",
  [MessageTemplate.kUnterminatedTemplate]: "Kehilangan } di templat expression",
  [MessageTemplate.kSyntaxError]: "%s",

  // Declaration
  [MessageTemplate.kConstDeclMissingInitialize]:
    "kalau pake 'isi', wajib langsung dikasih nilai — gak bisa kosong",
  [MessageTemplate.kVarRedeclaration]:
    "variabel '%s' udah ada, gak bisa bikin yang sama lagi!",

  // Expression
  [MessageTemplate.kInvalidAssignmentTarget]:
    "yang di kiri '=' gak bisa diisi nilai, salah sasaran",
  [MessageTemplate.kUnsupportedUnaryOperation]:
    "operasi '%s' gak bisa dipake ke %s, gak nyambung bro",
  [MessageTemplate.kUnsupportedBinaryOperation]:
    "operasi '%s' antara %s sama %s? itu gak mungkin",
  [MessageTemplate.kNonDefaultAfterDefault]:
    "parameter '%s' gak punya nilai default — harus sebelum yang punya default bro",
  [MessageTemplate.kPositionalAfterNamed]:
    "argumen biasa gak boleh setelah argumen bernama, kasih nama atau pindahin ke depan",

  // Runtime
  [MessageTemplate.kNotDefined]:
    "'%s' belum pernah ada — kamu manggil apa sih?",
  [MessageTemplate.kCalledNoCallable]:
    "%s itu bukan aksi, gak bisa dipanggil kayak gitu",
  [MessageTemplate.kAssignToContantVariable]:
    "'%s' nilainya tetap — gak bisa diubah-ubah!",
  [MessageTemplate.kDivisionByZero]:
    "bagi sama nol?? matematika lo di mana nih",
  [MessageTemplate.kIntegerModuleByZero]:
    "modulus sama nol juga gak bisa, sama aja gilanya",
  [MessageTemplate.kTooManyArguments]:
    "aksi '%s' cuma butuh %s argumen, kebanyakan nih",
  [MessageTemplate.kMissingArgument]:
    "parameter '%s' di aksi '%s' wajib diisi — jangan dikosongkan dong",
  [MessageTemplate.kDuplicateArgument]:
    "parameter '%s' dapat nilai dua kali — pilih salah satu, jangan serakah",
  [MessageTemplate.kInvaidObjectDescriptor]:
    "objek tidak valid, harus '%s' tapi yang diberikan '%s'",
  [MessageTemplate.kInvalidReturnValue]: "%s mengembalikan %s",
  [MessageTemplate.kObjectHasNoMember]: "objek '%s' tidak memiliki %s",

  // Control flow
  [MessageTemplate.kIllegalReturnStatement]:
    "'balikin' gak boleh di sini — ini bukan di dalam aksi",
  [MessageTemplate.kIllegalBreakStatement]:
    "'stop' gak boleh di sini — ini bukan di dalam loop",
  [MessageTemplate.kIllegalContinueStatement]:
    "'skip' gak boleh di sini — ini bukan di dalam loop",

  // Iteration
  [MessageTemplate.kNotIterable]:
    "%s itu gak bisa diiterasi — bukan objek yang bisa diiterasi",

  // Class and property
  [MessageTemplate.kGueOutsideClass]:
    "'gue' dipake di luar kelas? lah kamu siapa 😭 'gue' cuma valid di dalam aksi milik kelas",
  [MessageTemplate.kPropertyNotFound]:
    "'%s' gak ada di %s — salah panggil atau belum lo bikin?",
  [MessageTemplate.kCannotSetProperty]:
    "gak bisa ngubah '%s' di %s — jangan maksa dong",
  [MessageTemplate.kCannotGetSubscript]: "gak bisa ambil item di %s",
  [MessageTemplate.kCannotSetSubscript]: "gak bisa atur item di %s",
  [MessageTemplate.kTypeError]: "%s",
};

export const MessageTemplateNote: Partial<Record<MessageTemplate, string>> = {
  [MessageTemplate.kNotDefined]:
    "deklarasiin dulu pake 'titip nama = ...' atau 'isi nama = ...'",
  [MessageTemplate.kConstDeclMissingInitialize]:
    "contoh yang bener: isi MAKS = 100",
  [MessageTemplate.kVarRedeclaration]:
    "kalau mau ubah nilainya, assign langsung tanpa 'titip' atau 'isi'",
  [MessageTemplate.kAssignToContantVariable]:
    "kalau butuh nilai yang bisa diubah, pake 'titip' bukan 'isi'",
  [MessageTemplate.kIllegalReturnStatement]:
    "pindahin 'balikin' ke dalam blok aksi { ... }",
  [MessageTemplate.kIllegalBreakStatement]:
    "pindahin 'stop' ke dalam blok puter atau tiap { ... }",
  [MessageTemplate.kIllegalContinueStatement]:
    "pindahin 'skip' ke dalam blok puter atau tiap { ... }",
  [MessageTemplate.kNotIterable]:
    "tambahin aksi '__iterasi__' dan '__lanjut__' biar bisa diiterasi",
  [MessageTemplate.kCalledNoCallable]:
    "bikin dulu pake: aksi nama_aksi(...) { ... }",
  [MessageTemplate.kDivisionByZero]:
    "cek nilai pembaginya dulu, pastiin bukan nol sebelum dibagi",
  [MessageTemplate.kUnsupportedBinaryOperation]:
    "pastiin tipe data di kiri dan kanan operasi sudah sesuai",
};

// prettier-ignore
export const MessageTemplateMood: Record<MessageTemplate, Mood> = {
  [MessageTemplate.kNone]:                         Mood.Bingung,
  [MessageTemplate.kInvalidNumericSeparator]:      Mood.Bingung,
  [MessageTemplate.kTrailingNumericSeparator]:     Mood.Bingung,
  [MessageTemplate.kInvalidOrUnexpectedToken]:     Mood.Bingung,
  [MessageTemplate.kZeroDigitNumericSeparator]:    Mood.Bingung,
  [MessageTemplate.kUnexpectedTokenNumber]:        Mood.Bingung,
  [MessageTemplate.kUnexpectedTokenString]:        Mood.Bingung,
  [MessageTemplate.kUnexpectedTokenIdentifier]:    Mood.Bingung,
  [MessageTemplate.kUnexpectedEOS]:                Mood.Panik,
  [MessageTemplate.kConstDeclMissingInitialize]:   Mood.Sedih,
  [MessageTemplate.kVarRedeclaration]:             Mood.Marah,
  [MessageTemplate.kInvalidAssignmentTarget]:      Mood.Marah,
  [MessageTemplate.kUnsupportedUnaryOperation]:    Mood.Marah,
  [MessageTemplate.kUnsupportedBinaryOperation]:   Mood.Marah,
  [MessageTemplate.kNotDefined]:                   Mood.Sedih,
  [MessageTemplate.kCalledNoCallable]:             Mood.Panik,
  [MessageTemplate.kAssignToContantVariable]:      Mood.Marah,
  [MessageTemplate.kDivisionByZero]:               Mood.Gila,
  [MessageTemplate.kIntegerModuleByZero]:          Mood.Gila,
  [MessageTemplate.kIllegalReturnStatement]:       Mood.Panik,
  [MessageTemplate.kIllegalBreakStatement]:        Mood.Panik,
  [MessageTemplate.kIllegalContinueStatement]:     Mood.Panik,
  [MessageTemplate.kNotIterable]:                  Mood.Bingung,
  [MessageTemplate.kGueOutsideClass]:              Mood.Panik,
  [MessageTemplate.kPropertyNotFound]:             Mood.Sedih,
  [MessageTemplate.kCannotSetProperty]:            Mood.Marah,
  [MessageTemplate.kNonDefaultAfterDefault]:       Mood.Bingung,
  [MessageTemplate.kPositionalAfterNamed]:         Mood.Bingung,
  [MessageTemplate.kTooManyArguments]:             Mood.Marah,
  [MessageTemplate.kMissingArgument]:              Mood.Sedih,
  [MessageTemplate.kUnexpectedKeywordArgument]:    Mood.Bingung,
  [MessageTemplate.kDuplicateArgument]:            Mood.Marah,
  [MessageTemplate.kUnterminatedTemplate]:         Mood.Bingung,
  [MessageTemplate.kInvaidObjectDescriptor]:       Mood.Marah,
  [MessageTemplate.kInvalidReturnValue]:           Mood.Panik,
  [MessageTemplate.kObjectHasNoMember]:            Mood.Sedih,
  [MessageTemplate.kCannotGetSubscript]:           Mood.Sedih,
  [MessageTemplate.kCannotSetSubscript]:           Mood.Marah,
  [MessageTemplate.kTypeError]:                    Mood.Sedih,
  [MessageTemplate.kSyntaxError]:                  Mood.Bingung
};
