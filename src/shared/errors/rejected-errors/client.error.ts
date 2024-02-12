import { BadRequestException } from "@nestjs/common";
import { Effect as E } from "effect";

import type { Result } from "@root/types/Result.type";

import type { AnyHow } from "../anyhow";

export class ClientError implements AnyHow {
  static readonly _tag = "ClientError";

  static infer(err: AnyHow): err is ClientError {
    return ClientError._tag === err._tag;
  }

  static into(reasons: string): Result<ClientError, never> {
    return E.fail(new ClientError(reasons));
  }

  constructor(public readonly reasons: string) {}

  public readonly _tag = ClientError._tag;

  public endCode(): BadRequestException {
    return new BadRequestException(this.reasons);
  }

  public logError() {}
}
