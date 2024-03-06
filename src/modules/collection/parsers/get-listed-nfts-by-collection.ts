import { Prisma } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

import { OptionalProperty, PaginatedQuery } from "@root/shared/parser";

export class GetListedNftsByCollectionQuery extends PaginatedQuery {
  @OptionalProperty({
    enum: Prisma.SortOrder,
    description: "default = asc"
  })
  @IsOptional()
  @IsEnum(Prisma.SortOrder)
  sortByPrice: Prisma.SortOrder = "asc";
}
