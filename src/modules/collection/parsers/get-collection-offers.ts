import { IsNotEmpty } from "class-validator";

import { OptionalProperty, PaginatedQuery } from "@root/shared/parser";

export class GetCollectionOffersQuery extends PaginatedQuery {
  @OptionalProperty()
  @IsNotEmpty()
  walletAddress?: string;
}
