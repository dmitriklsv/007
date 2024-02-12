import { HttpStatus, InternalServerErrorException } from "@nestjs/common";
import { Effect as E, pipe } from "effect";

import type { Result } from "@root/types/Result.type";

import { ENCODED_ERROR_CODE, type AnyHow } from "../anyhow";

export class InfrastructureError implements AnyHow {
  static readonly _tag = "InfrastructureError";

  static infer(err: AnyHow): err is InfrastructureError {
    return InfrastructureError._tag === err._tag;
  }

  static into(error: unknown): Result<InfrastructureError, never> {
    return E.fail(new InfrastructureError(error));
  }

  static tryCatch<T>(
    tryPromise: (signal: AbortSignal) => Promise<T>
  ): Result<InfrastructureError, T> {
    return E.tryPromise({
      catch: error => new InfrastructureError(error),
      try: tryPromise
    });
  }

  constructor(public readonly error: unknown) {}

  public readonly _tag = InfrastructureError._tag;

  public endCode(): InternalServerErrorException {
    return new InternalServerErrorException({
      errorCode: ENCODED_ERROR_CODE["InfrastructureError"],
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR
    });
  }

  public logError(): void {
    return pipe(
      E.logError(`Infrastructure error with reason: ${this.error}`),
      E.runSync
    );
  }
}
