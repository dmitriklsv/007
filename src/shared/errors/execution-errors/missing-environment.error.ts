import { HttpStatus, InternalServerErrorException } from "@nestjs/common";
import { Effect as E, pipe } from "effect";

import type { Result } from "@root/types/Result.type";

import { ENCODED_ERROR_CODE, type AnyHow } from "../anyhow";

export class MissingEnvironmentError implements AnyHow {
  static readonly _tag = "MissingEnvironmentError";

  static infer(err: AnyHow): err is MissingEnvironmentError {
    return MissingEnvironmentError._tag === err._tag;
  }

  static into(config: string): Result<MissingEnvironmentError, never> {
    return E.fail(new MissingEnvironmentError(config));
  }

  constructor(public readonly config: string) {}

  public readonly _tag = MissingEnvironmentError._tag;

  public endCode(): InternalServerErrorException {
    return new InternalServerErrorException({
      errorCode: ENCODED_ERROR_CODE["MissingEnvironmentError"],
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR
    });
  }

  public logError(): void {
    return pipe(E.logError(`Missing environment: ${this.config}`), E.runSync);
  }
}
