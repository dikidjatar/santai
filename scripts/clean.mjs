import { rmSync, existsSync } from "node:fs";

const targets = [
  "packages/core/dist",
  "packages/cli/dist",
  "packages/santai-lang/dist",
  "packages/core/tsconfig.tsbuildinfo",
  "packages/cli/tsconfig.tsbuildinfo",
  "packages/santai-lang/tsconfig.tsbuildinfo",
  "coverage"
];

for (const target of targets) {
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
}

console.log("Clean completed.");