import { ApiPropertyOptional } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

import { PaginatedQuery } from "@root/shared/parser";

const status = {
  all: "all",
  listed: "listed",
  owned: "owned"
} as const;

type Status = (typeof status)[keyof typeof status];

export class GetNftsByOwnerQuery extends PaginatedQuery {
  @ApiPropertyOptional({ description: "search by id or name" })
  @IsOptional()
  collectionAddress?: string;

  @ApiPropertyOptional({ description: "search by id or name" })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: Prisma.SortOrder,
    description: "default is asc"
  })
  @IsOptional()
  @IsEnum(Prisma.SortOrder)
  sortByPrice: Prisma.SortOrder = Prisma.SortOrder.asc;

  @ApiPropertyOptional({ enum: status, description: "default is all" })
  @IsOptional()
  @IsEnum(status)
  status: Status = status.all;
}
