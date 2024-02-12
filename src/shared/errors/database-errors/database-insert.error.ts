import { HttpStatus, InternalServerErrorException } from "@nestjs/common";
import { Effect as E, pipe } from "effect";

import type { Result } from "@root/types/Result.type";

import { ENCODED_ERROR_CODE, type AnyHow } from "../anyhow";

export class DatabaseInsertError implements AnyHow {
  static readonly _tag = "DatabaseInsertError";

  static infer(err: AnyHow): err is DatabaseInsertError {
    return DatabaseInsertError._tag === err._tag;
  }

  static into(error: unknown): Result<DatabaseInsertError, never> {
    return E.fail(new DatabaseInsertError(error));
  }

  static tryCatch<T>(
    tryPromise: (signal: AbortSignal) => Promise<T>
  ): Result<DatabaseInsertError, T> {
    return E.tryPromise({
      catch: error => new DatabaseInsertError(error),
      try: tryPromise
    });
  }

  constructor(public readonly error: unknown) {}

  public readonly _tag = DatabaseInsertError._tag;

  public endCode(): InternalServerErrorException {
    return new InternalServerErrorException({
      errorCode: ENCODED_ERROR_CODE["DatabaseInsertError"],
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR
    });
  }

  public logError(): void {
    return pipe(
      E.logError(`Database insert error with reasons: ${this.error}`),
      E.runSync
    );
  }
}
