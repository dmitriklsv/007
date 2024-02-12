import { UnauthorizedException } from "@nestjs/common";
import { Effect as E } from "effect";

import type { Result } from "@root/types/Result.type";

import type { AnyHow } from "../anyhow";

export class AuthError implements AnyHow {
  static readonly _tag = "AuthError";

  static infer(err: AnyHow): err is AuthError {
    return AuthError._tag === err._tag;
  }

  static into(reasons: string): Result<AuthError, never> {
    return E.fail(new AuthError(reasons));
  }

  constructor(public readonly reasons: string) {}

  public readonly _tag = AuthError._tag;

  public endCode(): UnauthorizedException {
    return new UnauthorizedException(this.reasons);
  }

  public logError() {}
}
