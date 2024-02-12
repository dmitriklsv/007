import type { HttpException } from "@nestjs/common";

import { DatabaseDeleteError } from "./database-errors/database-delete.error";
import { DatabaseInsertError } from "./database-errors/database-insert.error";
import { DatabaseQueryNotFoundError } from "./database-errors/database-query-not-found.error";
import { DatabaseQueryError } from "./database-errors/database-query.error";
import { DatabaseUpdateError } from "./database-errors/database-update.error";
import { InfrastructureError } from "./execution-errors/infrastructure.error";
import { MissingEnvironmentError } from "./execution-errors/missing-environment.error";
import { NullError } from "./execution-errors/null.error";
import { AuthError } from "./rejected-errors/auth.error";
import { ClientError } from "./rejected-errors/client.error";

// Represent any expected error, any error definition should be implemented this type
export type AnyHow<T extends HttpException = HttpException> = {
  _tag: string;
  endCode: () => T;
  logError: () => void;
};

export const encodeError = <T extends HttpException>(err: AnyHow<T>): never => {
  err.logError();
  throw err.endCode();
};

// The code of HttpResponse for tracing
export const ENCODED_ERROR_CODE = {
  [DatabaseDeleteError._tag]: "RTE001",
  [DatabaseInsertError._tag]: "RTE002",
  [DatabaseQueryNotFoundError._tag]: "RTE003",
  [DatabaseQueryError._tag]: "RTE004",
  [DatabaseUpdateError._tag]: "RTE005",
  [AuthError._tag]: "RTE006",
  [ClientError._tag]: "RTE007",
  [InfrastructureError._tag]: "RTE008",
  [MissingEnvironmentError._tag]: "RTE009",
  [NullError._tag]: "RTE010"
} as const;
