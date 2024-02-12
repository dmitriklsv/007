import { Effect as E, Either, identity } from "effect";

import type { Result } from "@root/types/Result.type";

import type { AnyHow } from "../errors/anyhow";
import { encodeError } from "../errors/anyhow";

export const genericApi = <E extends AnyHow, A>(
  result: Result<E, A>
): Promise<A> =>
  E.runPromise(E.either(result)).then(
    Either.match({ onLeft: encodeError, onRight: identity })
  );
