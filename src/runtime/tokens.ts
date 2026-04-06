// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { createToken } from "../base/serviceToken";
import { RuntimeContext } from "./runtimeContext";

export const Tokens = {
  RuntimeContext: createToken<RuntimeContext>("RuntimeContext"),
} as const;

// Re-export so callers can `import { Tokens } from "../runtime/tokens"` without
// also importing serviceToken.ts for the type.
export type { ServiceToken } from "../base/serviceToken";
