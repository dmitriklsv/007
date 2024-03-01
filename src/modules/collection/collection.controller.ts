import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { CollectionService } from "./collection.service";
import { GetCollectionOffersQuery } from "./parsers/get-collection-offers.parser";
import { GetHighestCollectionOfferForOwnedNftAddress } from "./parsers/get-highest-offer.parser";

@Controller("collections")
@ApiTags("collections")
export class CollectionController {
  constructor(private collectionService: CollectionService) {}

  @Get(":collection_address/offers")
  getCollectionOffers(
    @Param("collection_address") collectionAddress: string,
    @Query() query: GetCollectionOffersQuery
  ) {
    return this.collectionService.getCollectionsOffers(
      collectionAddress,
      query
    );
  }

  @Get(":collection_address/highest_offer")
  getHighestOfferForSeller(
    @Param("collection_address") collectionAddress: string,
    @Query() query: GetHighestCollectionOfferForOwnedNftAddress
  ) {
    return this.collectionService.getHighestCollectionOfferForOwnedNftAddress(
      collectionAddress,
      query
    );
  }
}
