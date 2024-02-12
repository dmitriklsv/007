import { HttpStatus, InternalServerErrorException } from "@nestjs/common";
import { Effect as E, pipe } from "effect";

import type { Result } from "@root/types/Result.type";

import { ENCODED_ERROR_CODE, type AnyHow } from "../anyhow";

export class DatabaseDeleteError implements AnyHow {
  static readonly _tag = "DatabaseDeleteError";

  static infer(err: AnyHow): err is DatabaseDeleteError {
    return DatabaseDeleteError._tag === err._tag;
  }

  static into(error: unknown): Result<DatabaseDeleteError, never> {
    return E.fail(new DatabaseDeleteError(error));
  }

  static tryCatch<T>(
    tryPromise: (signal: AbortSignal) => Promise<T>
  ): Result<DatabaseDeleteError, T> {
    return E.tryPromise({
      catch: error => new DatabaseDeleteError(error),
      try: tryPromise
    });
  }

  constructor(public readonly error: unknown) {}

  public readonly _tag = DatabaseDeleteError._tag;

  public endCode(): InternalServerErrorException {
    return new InternalServerErrorException({
      errorCode: ENCODED_ERROR_CODE["DatabaseDeleteError"],
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR
    });
  }

  public logError(): void {
    return pipe(
      E.logError(`Database delete error with reasons: ${this.error}`),
      E.runSync
    );
  }
}
