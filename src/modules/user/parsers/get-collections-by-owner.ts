import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional } from "class-validator";

import { PaginatedQuery } from "@root/shared/parser";

export class GetCollectionsByOwnerParams extends PaginatedQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value || undefined)
  search?: string;
}
