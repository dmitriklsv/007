import type { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { retry } from "ts-retry-promise";

import { readConfigOrThrow } from "@root/shared/helper/read-config";
import { CollectionRepository } from "@root/shared/repositories/collection.repository";
import { NftRepository } from "@root/shared/repositories/nft.repository";
import { getNftMetadata } from "@root/shared/services/http/get-nft-metadata";
import { getAllTokensFromContract } from "@root/shared/services/query-contract/get-all-tokens-from-collection";
import { getContractInfo } from "@root/shared/services/query-contract/get-contract-info";
import { getNftInfo } from "@root/shared/services/query-contract/get-nft-info";
import { getNftOwner } from "@root/shared/services/query-contract/get-nft-owner";

/* eslint-disable */
const COLLECTIONS = [
  "sei1hvfnkmf8vy7awjf60h6eeaywpq378329x8z4k9ctkf3lpl0x536qp4lrhu",
  "sei1l8tjmjagrrjtrzncewtvscs39dezdcg2cuvemen3wgunlfpr45qqpaawl9"
];
/* eslint-enable */

@Injectable()
export class BackgroundService {
  private process = new Map<string, boolean>();

  constructor(
    private configService: ConfigService,
    private collectionRepository: CollectionRepository,
    private nftRepository: NftRepository
  ) {}

  @Cron(CronExpression.EVERY_SECOND)
  async createCollections() {
    try {
      if (this.process.get("create_collection")) {
        return;
      }

      this.process.set("create_collection", true);

      const rpc = readConfigOrThrow("RPC_URL")(this.configService);
      const client = await SigningCosmWasmClient.connect(rpc);

      for (const address of COLLECTIONS) {
        const createdCollection =
          await this.collectionRepository.findByAddress(address);

        if (!createdCollection) {
          const contractInfo = await retry(
            () => getContractInfo(client, address),
            { delay: 200, retries: 6 }
          );

          await this.collectionRepository.create({
            address,
            name: contractInfo.name,
            symbol: contractInfo.symbol
          });
        }

        const tokens = await retry(
          () => getAllTokensFromContract(client, address).then(rs => rs.tokens),
          { delay: 200, retries: 6 }
        );

        await Promise.all(
          tokens.map(async tokenId => {
            const created_nft =
              await this.nftRepository.findByAddressAndTokenId(
                address,
                tokenId
              );
            if (!created_nft) {
              await retry(
                () => this.createNftOnEachCollection(address, tokenId, client),
                { delay: 200, retries: 6 }
              );
            }
          })
        );
      }

      this.process.set("create_collection", false);
      console.log("done create collections and nfts");
    } catch (error) {
      console.error(error);
      this.process.set("create_collection", false);
    }
  }

  private async createNftOnEachCollection(
    collectionAddress: string,
    tokenId: string,
    client: CosmWasmClient
  ) {
    const nftInfo = await getNftInfo(client, collectionAddress, tokenId);

    if (!nftInfo.token_uri) {
      return;
    }

    const nftMetadata = await getNftMetadata(nftInfo.token_uri);

    if (!nftMetadata.name) {
      return;
    }

    const nftOwner = await getNftOwner(client, collectionAddress, tokenId);

    await this.nftRepository.createNft({
      address: collectionAddress,
      image: nftMetadata.image,
      ownerAddress: nftOwner.owner,
      name: nftMetadata.name,
      description: nftMetadata.description,
      traits: nftMetadata.attributes,
      tokenId
    });

    return;
  }
}
