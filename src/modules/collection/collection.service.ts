import { Injectable } from "@nestjs/common";
import { Effect, pipe } from "effect";

import type { Result } from "@root/types/Result.type";

@Injectable()
export class CollectionService {
  public getCollection(address: string): Result<never, { address: string }> {
    return pipe({ address }, Effect.succeed);
  }
}
