import type { ConfigService } from "@nestjs/config";
import { Config, Effect as E, Option as O, identity, pipe } from "effect";

import type { AppEnvironment } from "@root/types/Environment.type";
import type { Result } from "@root/types/Result.type";

import { MissingEnvironmentError } from "../errors/execution-errors/missing-environment.error";

export const readConfigOrExit =
  (configService: ConfigService) =>
  (config: string): string =>
    pipe(
      configService.get<string | undefined>(config),
      O.fromNullable,
      O.match({
        onNone: () => {
          console.error(`Missing ${config} env`);
          process.exit(1);
        },
        onSome: identity
      })
    );

export const readConfig = <T extends string>(
  config: string
): Result<MissingEnvironmentError, T> =>
  pipe(
    Config.string(config) as Config.Config<T>,
    E.mapError(() => new MissingEnvironmentError(config))
  );

export const readAppEnvironment = (): AppEnvironment =>
  pipe(
    readConfig<AppEnvironment>("APP"),
    E.orElse(() => E.succeed<AppEnvironment>("local")),
    E.runSync
  );
