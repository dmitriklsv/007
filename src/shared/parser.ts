import type { ApiPropertyOptions } from "@nestjs/swagger";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function IsBool(target: any, propertyKey: string | symbol) {
  Transform(({ value }) => {
    return [true, "enabled", "true"].indexOf(value) > -1;
  })(target, propertyKey);
  IsBoolean()(target, propertyKey);
}

export function OptionalProperty(
  options?: ApiPropertyOptions
): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (target: any, propertyKey: string | symbol) => {
    ApiPropertyOptional(options)(target, propertyKey);
    IsOptional()(target, propertyKey);
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function IsInteger(target: any, propertyKey: string | symbol) {
  Type(() => Number)(target, propertyKey);
  IsInt()(target, propertyKey);
}

export class PaginatedQuery {
  @OptionalProperty({ example: 1 })
  @IsInteger
  @Min(1)
  page: number = 1;

  @OptionalProperty({ example: 60 })
  @IsInteger
  @Max(300)
  take: number = 60;
}
