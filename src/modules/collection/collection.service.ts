import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CollectionOffer } from "@prisma/client";

import { readConfigOrThrow } from "@root/shared/helper/read-config";
import { CollectionRepository } from "@root/shared/repositories/collection.repository";
import { getOwnedNftsByAddress } from "@root/shared/services/http/get-owned-nfts-by-address";
import type { PaginatedResponse } from "@root/types/PaginatedReponse.type";

import type { GetCollectionOffersQuery } from "./parsers/get-collection-offers.parser";
import type { GetHighestCollectionOfferForOwnedNftAddress } from "./parsers/get-highest-offer.parser";

@Injectable()
export class CollectionService {
  constructor(
    private collectionRepository: CollectionRepository,
    private configService: ConfigService
  ) {}

  public async getCollectionsOffers(
    collectionAddress: string,
    query: GetCollectionOffersQuery
  ): Promise<PaginatedResponse<CollectionOffer>> {
    const { nodes, total } =
      await this.collectionRepository.findPagedCollectionOffers(
        collectionAddress,
        query
      );

    return {
      data: nodes,
      total,
      page: query.page,
      take: query.take
    };
  }

  public async getHighestCollectionOfferForOwnedNftAddress(
    collectionAddress: string,
    { walletAddress }: GetHighestCollectionOfferForOwnedNftAddress
  ) {
    const palletApiUrl = readConfigOrThrow("PALLET_API_URL")(
      this.configService
    );

    // mean all collections that user have nft on it
    const allOwnedCollection = await getOwnedNftsByAddress(
      palletApiUrl,
      walletAddress
    ).then(response =>
      response.nfts.map(nft => nft.collection.contract_address)
    );

    // if user don't have nft on given collection_address return null
    if (!allOwnedCollection.includes(collectionAddress)) {
      return {
        highestOffer: null
      };
    }

    const highestOffer =
      await this.collectionRepository.findHighestCollectionOffer(
        collectionAddress,
        walletAddress
      );

    return {
      highest_offer: highestOffer?.[0]
    };
  }
}
