import type { Prisma } from "@prisma/client";
import { Effect as E, pipe } from "effect";

import type { Result } from "@root/types/Result.type";

import { DatabaseQueryNotFoundError } from "../errors/database-errors/database-query-not-found.error";
import { DatabaseQueryError } from "../errors/database-errors/database-query.error";

export const safetyFindOne =
  (table: Prisma.ModelName, args?: unknown) =>
  <T>(
    unsafeFind: (signal: AbortSignal) => Promise<T>
  ): Result<DatabaseQueryError | DatabaseQueryNotFoundError, NonNullable<T>> =>
    pipe(
      DatabaseQueryError.tryCatch(unsafeFind),
      E.flatMap(E.fromNullable),
      E.catchTag("NoSuchElementException", () =>
        DatabaseQueryNotFoundError.into(table, args)
      )
    );
