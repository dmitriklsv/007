import { IsNotEmpty } from "class-validator";

import { OptionalProperty } from "@root/shared/parser";

export class GetOwnedNfts {
  @OptionalProperty()
  @IsNotEmpty()
  collectionAddress?: string;
}
