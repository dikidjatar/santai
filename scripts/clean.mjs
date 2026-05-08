import { rmSync, existsSync } from "node:fs";

const targets = [
  "packages/core/dist",
  "packages/cli/dist",
  "packages/core/tsconfig.tsbuildinfo",
  "packages/cli/tsconfig.tsbuildinfo",
  "coverage"
];

for (const target of targets) {
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
}

console.log("Clean selesai.");