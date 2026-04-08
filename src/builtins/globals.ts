// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

// import all modules for side-effect registration
// The order of imports is not significant because each module registers
// different name. BuiltinRegistry will throw an error if there are duplicates.

export * from "./builtins-teks";
export * from "./builtins-angka";
export * from "./builtins-daftar";
export * from "./builtins-rentang";

export * from "./builtins-io";
export * from "./builtins-global-functional";
export * from "./builtins-global-class";
export * from "./builtins-sistem";
