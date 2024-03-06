import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { CollectionService } from "./collection.service";
import { CreateCollectionPayload } from "./parsers/create-collection";
import { GetCollectionOffersQuery } from "./parsers/get-collection-offers";
import { GetHighestCollectionOfferForOwnedNftAddressQuery } from "./parsers/get-highest-offer";
import { GetListedNftsByCollectionQuery } from "./parsers/get-listed-nfts-by-collection";

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
    @Query() query: GetHighestCollectionOfferForOwnedNftAddressQuery
  ) {
    return this.collectionService.getHighestCollectionOfferForOwnedNftAddress(
      collectionAddress,
      query
    );
  }

  @Get(":collection_address/listed-nfts")
  getListedNftOnACollection(
    @Param("collection_address") collectionAddress: string,
    @Query() query: GetListedNftsByCollectionQuery
  ) {
    return this.collectionService.getPagedListedNftsByCollectionAddress(
      collectionAddress,
      query
    );
  }

  @Post()
  createCollection(@Body() body: CreateCollectionPayload) {
    return this.collectionService.createCollection(body.collectionAddress);
  }
}
