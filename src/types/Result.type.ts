import type { Effect } from "effect";

export type Result<E, A> = Effect.Effect<never, E, A>;
