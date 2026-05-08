const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import('jest').Config} */
module.exports = {
  ...createDefaultPreset(),

  testEnvironment: "node",

  roots: ["<rootDir>/src"],

  testMatch: [
    "**/*.test.ts"
  ],

  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts"
  ],

  coverageDirectory: "coverage",

  clearMocks: true
};