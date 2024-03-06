import { Injectable } from "@nestjs/common";

import { CollectionRepository } from "@root/shared/repositories/collection.repository";
import { NftRepository } from "@root/shared/repositories/nft.repository";

import type { GetCollectionsByOwnerParams } from "./parsers/get-collections-by-owner";
import type { GetNftsByOwnerQuery } from "./parsers/get-nfts-by-owner";

@Injectable()
export class UserService {
  constructor(
    private nftRepository: NftRepository,
    private collectionRepository: CollectionRepository
  ) {}

  public async getOwnedNfts(ownedAddress: string, query: GetNftsByOwnerQuery) {
    const { nfts, total } = await this.nftRepository.findPagedNftsByOwner(
      ownedAddress,
      query
    );

    return {
      data: nfts,
      total,
      page: query.page,
      take: query.take
    };
  }

  public getListedNftsBySellerAddress(sellerAddress: string) {
    return this.nftRepository.findListingsBySellerAddress(sellerAddress);
  }

  public async getCollectionsByOwner(
    ownerAddress: string,
    query: GetCollectionsByOwnerParams
  ) {
    const { collections, total } =
      await this.collectionRepository.findPagedCollectionViews({
        page: query.page,
        take: query.take,
        ownerAddress,
        search: query.search
      });

    return {
      data: collections,
      total,
      page: query.page,
      take: query.take
    };
  }
}
