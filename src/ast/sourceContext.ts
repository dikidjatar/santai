// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { CharacterStream } from "../parsing/scanner";

export interface SourceContext {
  readonly characterStream: CharacterStream;
  readonly filename: string;
}
