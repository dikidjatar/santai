// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { assert, assertDefined } from "./asserts";
import { BugIndicatingError } from "./errors";

describe("assert", () => {
  it("should not throw when condition is truthy", () => {
    expect(() => assert(true)).not.toThrow();
  });

  it("should throw AssertionError when condition is falsy", () => {
    expect(() => assert(false)).toThrow(BugIndicatingError);
    expect(() => assert(false, new Error("OK"))).toThrow(Error);
    class CustomError extends Error {}
    expect(() => assert(false, new CustomError())).toThrow(CustomError);
  });

  it("should throw with custom message", () => {
    expect(() => assert(false, "Expected condition to be true")).toThrow(Error);
  });
});

describe("assertDefined", () => {
  it("should not throw for defined values", () => {
    expect(() => assertDefined("value")).not.toThrow();
    expect(() => assertDefined(0)).not.toThrow();
    expect(() => assertDefined(false)).not.toThrow();
    expect(() => assertDefined({})).not.toThrow();
  });

  it("should throw for null or undefined", () => {
    expect(() => assertDefined(null)).toThrow(BugIndicatingError);
    expect(() => assertDefined(undefined)).toThrow(BugIndicatingError);
  });
});
