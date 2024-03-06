import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class GetHighestCollectionOfferForOwnedNftAddressQuery {
  // mean user who owned the nfts of given collection_address
  @ApiProperty()
  @IsNotEmpty()
  walletAddress: string;
}
