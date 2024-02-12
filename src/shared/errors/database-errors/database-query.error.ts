import { HttpStatus, InternalServerErrorException } from "@nestjs/common";
import { Effect as E, pipe } from "effect";

import type { Result } from "@root/types/Result.type";

import { ENCODED_ERROR_CODE, type AnyHow } from "../anyhow";

export class DatabaseQueryError implements AnyHow {
  static readonly _tag = "DatabaseQueryError";

  static infer(err: AnyHow): err is DatabaseQueryError {
    return DatabaseQueryError._tag === err._tag;
  }

  static into(error: unknown): Result<DatabaseQueryError, never> {
    return E.fail(new DatabaseQueryError(error));
  }

  static tryCatch<T>(
    tryPromise: (signal: AbortSignal) => Promise<T>
  ): Result<DatabaseQueryError, T> {
    return E.tryPromise({
      catch: error => new DatabaseQueryError(error),
      try: tryPromise
    });
  }

  constructor(public readonly error: unknown) {}

  public readonly _tag = DatabaseQueryError._tag;

  public endCode(): InternalServerErrorException {
    return new InternalServerErrorException({
      errorCode: ENCODED_ERROR_CODE["DatabaseQueryError"],
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR
    });
  }

  public logError(): void {
    return pipe(
      E.logError(`Database query error with reason: ${this.error}`),
      E.runSync
    );
  }
}
