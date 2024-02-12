import { HttpStatus, InternalServerErrorException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { Effect as E, pipe } from "effect";

import type { Result } from "@root/types/Result.type";

import { ENCODED_ERROR_CODE, type AnyHow } from "../anyhow";

export class DatabaseQueryNotFoundError implements AnyHow {
  static readonly _tag = "DatabaseQueryNotFoundError";

  static infer(err: AnyHow): err is DatabaseQueryNotFoundError {
    return DatabaseQueryNotFoundError._tag === err._tag;
  }

  static into(
    table: Prisma.ModelName,
    args: unknown
  ): Result<DatabaseQueryNotFoundError, never> {
    return E.fail(new DatabaseQueryNotFoundError(table, args));
  }

  constructor(
    public readonly table: Prisma.ModelName,
    public readonly args: unknown
  ) {}

  public readonly _tag = DatabaseQueryNotFoundError._tag;

  public endCode(): InternalServerErrorException {
    return new InternalServerErrorException({
      errorCode: ENCODED_ERROR_CODE["DatabaseQueryNotFoundError"],
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR
    });
  }

  public logError(): void {
    return pipe(
      E.logError(`Not found record on table ${this.table} with ${this.args}`),
      E.runSync
    );
  }
}
