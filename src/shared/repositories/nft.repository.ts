import { Injectable } from "@nestjs/common";
import type {
  ListingNft,
  NftActivityKind,
  Prisma,
  SaleType
} from "@prisma/client";

import { PrismaService } from "@root/libs/prisma/prisma.service";

import type { NftAttribute } from "../services/http/get-nft-metadata";

type FindNftByTokenAddressAndTokenId = {
  tokenAddress: string;
  tokenId: string;
  withListing?: boolean;
};

type CreateNftParams = {
  tokenId: string;
  name: string;
  image: string;
  tokenUri: string;
  traits: Array<NftAttribute>;
  collection: {
    address: string;
  };
  description?: string;
};

type CreateNftListingParam = {
  nft_id: number;
  txHash: string;
  price: number;
  denom: string;
  sellerAddress: string;
  saleType: SaleType;
  collectionAddress: string;
  startDate?: Date;
  endDate?: Date;
  minBidIncrementPercent?: number;
};

type CreateNftOffer = {
  txHash: string;
  nftId: number; // id in database
  buyerAddress: string;
  price: number;
  denom: string;
  startDate: Date;
  endDate: Date;
};

type CreateNftActivityParam = {
  txHash: string;
  price: number;
  denom: string;
  eventKind: NftActivityKind;
  metadata: Prisma.InputJsonValue;
  nftId: number;
  sellerAddress?: string;
  buyerAddress?: string;
};

type CreateNftBiddingParams = {
  listing: ListingNft;
  buyerAddress: string;
  price: number;
  txHash: string;
};

type UpdateNftListingParams = {
  listing: ListingNft;
  price?: number;
  minBidIncrementPercent?: number;
};

@Injectable()
export class NftRepository {
  constructor(private prisma: PrismaService) {}

  public findByAddressAndTokenId({
    tokenAddress,
    tokenId,
    withListing
  }: FindNftByTokenAddressAndTokenId) {
    return this.prisma.nft.findUnique({
      where: {
        token_address_token_id: {
          token_address: tokenAddress,
          token_id: tokenId
        }
      },
      include: {
        Listing: withListing
      }
    });
  }

  public createNft({
    collection,
    image,
    name,
    traits,
    description,
    tokenId,
    tokenUri
  }: CreateNftParams) {
    return this.prisma.nft.create({
      data: {
        name,
        token_id: tokenId,
        token_uri: tokenUri,
        description,
        image,
        Traits: {
          createMany: {
            data: traits?.map(({ trait_type, value, display_type, type }) => ({
              attribute: trait_type || type || "unknown",
              value: value.toString(),
              display_type
            }))
          }
        },
        Collection: {
          connect: {
            address: collection.address
          }
        }
      }
    });
  }

  public createNftListing({
    denom,
    nft_id,
    price,
    saleType,
    endDate,
    minBidIncrementPercent,
    sellerAddress,
    startDate,
    txHash,
    collectionAddress
  }: CreateNftListingParam) {
    return this.prisma.listingNft.create({
      data: {
        denom,
        sale_type: saleType,
        tx_hash: txHash,
        end_date: endDate,
        start_date: startDate,
        min_bid_increment_percent: minBidIncrementPercent,
        price,
        collection_address: collectionAddress,
        Seller: {
          connectOrCreate: {
            where: {
              address: sellerAddress
            },
            create: {
              address: sellerAddress
            }
          }
        },
        Nft: {
          connect: {
            id: nft_id
          }
        }
      }
    });
  }

  public createNftOffer({
    buyerAddress,
    endDate,
    nftId,
    price,
    startDate,
    txHash,
    denom
  }: CreateNftOffer) {
    return this.prisma.nftOffer.create({
      data: {
        tx_hash: txHash,
        nft_id: nftId,
        end_date: endDate,
        price,
        denom,
        start_date: startDate,
        buyer_address: buyerAddress
      }
    });
  }

  public deleteNftOffer(nftId: number, buyerAddress: string) {
    return this.prisma.nftOffer.delete({
      where: {
        nft_id_buyer_address: {
          nft_id: nftId,
          buyer_address: buyerAddress
        },
        status: "pending"
      }
    });
  }

  public createNftActivity({
    denom,
    metadata,
    price,
    eventKind,
    nftId,
    txHash,
    sellerAddress,
    buyerAddress
  }: CreateNftActivityParam) {
    return this.prisma.nftActivity.create({
      data: {
        nft_id: nftId,
        denom,
        event_kind: eventKind,
        seller_address: sellerAddress,
        metadata,
        price,
        tx_hash: txHash,
        buyer_address: buyerAddress
      }
    });
  }

  public findNftOfferByBuyerAddressAndNftId(
    buyerAddress: string,
    nftId: number
  ) {
    return this.prisma.nftOffer.findUnique({
      where: {
        nft_id_buyer_address: {
          buyer_address: buyerAddress,
          nft_id: nftId
        },
        status: "pending"
      }
    });
  }

  public completeNftOfferByTxHash(txHash: string) {
    return this.prisma.nftOffer.update({
      where: {
        tx_hash: txHash
      },
      data: {
        status: "done"
      }
    });
  }

  public createNftBidding({
    buyerAddress,
    listing,
    price,
    txHash
  }: CreateNftBiddingParams) {
    return this.prisma.nftBidding.create({
      data: {
        buyer_address: buyerAddress,
        denom: listing.denom,
        price,
        tx_hash: txHash,
        listing_hash: listing.tx_hash
      }
    });
  }

  public deleteNftBidding(buyerAddress: string, listing: ListingNft) {
    return this.prisma.nftBidding.deleteMany({
      where: {
        buyer_address: buyerAddress,
        listing_hash: listing.tx_hash
      }
    });
  }

  public updateListing({
    listing,
    minBidIncrementPercent,
    price
  }: UpdateNftListingParams) {
    return this.prisma.listingNft.update({
      where: {
        tx_hash: listing.tx_hash
      },
      data: {
        min_bid_increment_percent: minBidIncrementPercent,
        price
      }
    });
  }

  public deleteListing(listing: ListingNft) {
    return this.prisma.listingNft.delete({
      where: {
        tx_hash: listing.tx_hash
      }
    });
  }
}
