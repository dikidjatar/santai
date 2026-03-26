// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import { SantaiObject } from "./object";

export abstract class SantaiIterator
  implements Iterator<SantaiObject>, Iterable<SantaiObject>
{
  abstract hasNext(): boolean;
  abstract next(): IteratorResult<SantaiObject, any>;

  [Symbol.iterator](): Iterator<SantaiObject> {
    return this;
  }
}
