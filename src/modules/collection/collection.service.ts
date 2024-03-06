import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { BadRequestException, Injectable } from "@nestjs/common";
import type { CollectionOffer } from "@prisma/client";
import { isValidSeiAddress } from "@sei-js/core";

import { PrismaService } from "@root/libs/prisma/prisma.service";
import {
  InjectCosmWasmClient,
  InjectSecrets,
  Secrets
} from "@root/libs/secret/secret.module";
import { CollectionRepository } from "@root/shared/repositories/collection.repository";
import { getNftMetadata } from "@root/shared/services/http/get-nft-metadata";
import { getContractInfo } from "@root/shared/services/query-contract/get-contract-info";
import { getNftInfo } from "@root/shared/services/query-contract/get-nft-info";
import { getNftOwner } from "@root/shared/services/query-contract/get-nft-owner";
import { getNumTokensOfCollection } from "@root/shared/services/query-contract/get-num-tokens-of-collection";
import type { PaginatedResponse } from "@root/types/PaginatedReponse.type";

import type { GetCollectionOffersQuery } from "./parsers/get-collection-offers";
import type { GetHighestCollectionOfferForOwnedNftAddressQuery } from "./parsers/get-highest-offer";
import type { GetListedNftsByCollectionQuery } from "./parsers/get-listed-nfts-by-collection";

@Injectable()
export class CollectionService {
  constructor(
    private collectionRepository: CollectionRepository,
    private prisma: PrismaService,
    @InjectSecrets() private secrets: Secrets,
    @InjectCosmWasmClient() private client: CosmWasmClient
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

  public async createCollection(collectionAddress: string) {
    if (!isValidSeiAddress(collectionAddress)) {
      throw new BadRequestException("Invalid collection address");
    }

    const existedCollection =
      await this.collectionRepository.findByAddress(collectionAddress);

    if (!existedCollection) {
      const contractInfo = await getContractInfo(
        this.client,
        collectionAddress
      );

      await this.collectionRepository.create({
        address: collectionAddress,
        name: contractInfo.name,
        symbol: contractInfo.symbol
      });

      await this.createAllNftWithOwnerOnANewCollection(collectionAddress);
    }

    return { collectionAddress };
  }

  public async getHighestCollectionOfferForOwnedNftAddress(
    collectionAddress: string,
    { walletAddress }: GetHighestCollectionOfferForOwnedNftAddressQuery
  ) {
    // mean all collections that user have nft on it
    const allOwnedCollection = await this.collectionRepository
      .findCollectionsByOwner(walletAddress)
      .then(collections => collections.map(collection => collection.address));

    // if user don't have nft on given collection_address return null
    if (!allOwnedCollection.includes(collectionAddress)) {
      return {
        highestOffer: null
      };
    }

    const highestOffer =
      await this.collectionRepository.findHighestCollectionOfferExcludeSelfOffer(
        collectionAddress,
        walletAddress
      );

    return {
      highest_offer: highestOffer
    };
  }

  public async getPagedListedNftsByCollectionAddress(
    collectionAddress: string,
    query: GetListedNftsByCollectionQuery
  ) {
    const { listings, total } =
      await this.collectionRepository.findPagedListedNftsByCollectionAddress(
        collectionAddress,
        query
      );

    return {
      data: listings,
      total,
      page: query.page,
      take: query.take
    };
  }

  public async createAllNftWithOwnerOnANewCollection(
    collectionAddress: string
  ) {
    const CHUNK = 100;
    const totalTokens = await getNumTokensOfCollection(
      this.client,
      collectionAddress
    ).then(res => res.count);

    const tokens = Array.from({ length: totalTokens }, (_, idx) => idx + 1);

    for (let i = 0; i < tokens.length; i += CHUNK) {
      await Promise.allSettled(
        tokens.slice(i, i + CHUNK).map(async tokenId => {
          let token_uri: string | null = null;

          try {
            token_uri = await getNftInfo(
              this.client,
              collectionAddress,
              tokenId.toString()
            ).then(res => res.token_uri);
          } catch (error) {
            token_uri = null;
          }

          if (!token_uri) {
            return;
          }

          const metadata = await getNftMetadata(token_uri);

          const owner = await getNftOwner(
            this.client,
            collectionAddress,
            tokenId.toString()
          );

          await this.prisma.nft.upsert({
            where: {
              token_address_token_id: {
                token_address: collectionAddress,
                token_id: tokenId.toString()
              }
            },
            create: {
              name: metadata.name,
              token_id: tokenId.toString(),
              token_uri: token_uri,
              description: metadata.description,
              image: metadata.image,
              owner_address: owner.owner,
              Traits: {
                createMany: {
                  data:
                    metadata?.attributes?.map(
                      ({ trait_type, value, display_type, type }) => ({
                        attribute: trait_type || type || "unknown",
                        value: value?.toString() || "unknown",
                        display_type
                      })
                    ) || []
                }
              },
              Collection: {
                connect: {
                  address: collectionAddress
                }
              }
            },
            update: {
              owner_address: owner.owner
            }
          });
        })
      );
    }

    return {
      count: totalTokens
    };
  }
}
