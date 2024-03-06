import { Injectable } from "@nestjs/common";
import type {
  ListingNft,
  NftActivityKind,
  Prisma,
  SaleType
} from "@prisma/client";
import type { DateTime } from "luxon";

import { PrismaService } from "@root/libs/prisma/prisma.service";
import type { GetNftsByOwnerQuery } from "@root/modules/user/parsers/get-nfts-by-owner";

import type { NftAttribute } from "../services/http/get-nft-metadata";

type FindNftByTokenAddressAndTokenId = {
  tokenAddress: string;
  tokenId: string;
  withListing?: boolean;
};

type CreateNftParams = {
  tokenId: string;
  tokenUri: string;
  collection: {
    address: string;
  };
  name?: string;
  image?: string;
  traits?: Array<NftAttribute>;
  description?: string;
  ownerAddress?: string;
};

type CreateNftListingParam = {
  nft_id: number;
  txHash: string;
  price: number;
  denom: string;
  sellerAddress: string;
  saleType: SaleType;
  collectionAddress: string;
  createdDate: DateTime;
  startDate?: DateTime;
  endDate?: DateTime;
  minBidIncrementPercent?: number;
};

type CreateNftOffer = {
  txHash: string;
  nftId: number; // id in database
  buyerAddress: string;
  price: number;
  denom: string;
  startDate: DateTime;
  endDate: DateTime;
  createdDate: DateTime;
};

type CreateNftActivityParam = {
  txHash: string;
  price: number;
  denom: string;
  eventKind: NftActivityKind;
  metadata: Prisma.InputJsonValue;
  nftId: number;
  createdDate: DateTime;
  sellerAddress?: string;
  buyerAddress?: string;
};

type CreateNftBiddingParams = {
  listing: ListingNft;
  buyerAddress: string;
  price: number;
  txHash: string;
  createdDate: DateTime;
};

type UpdateNftListingParams = {
  listing: ListingNft;
  price?: number;
  minBidIncrementPercent?: number;
};

type UpdateOwnerParams = {
  tokenAddress: string;
  tokenId: string;
  ownerAddress: string;
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
    traits = [],
    description,
    tokenId,
    tokenUri,
    ownerAddress
  }: CreateNftParams) {
    return this.prisma.nft.create({
      data: {
        name,
        token_id: tokenId,
        token_uri: tokenUri,
        description,
        image,
        owner_address: ownerAddress,
        Traits: {
          createMany: {
            data: traits.map(({ trait_type, value, display_type, type }) => ({
              attribute: trait_type || type || "unknown",
              value: value?.toString() || "unknown",
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
    collectionAddress,
    createdDate
  }: CreateNftListingParam) {
    return this.prisma.listingNft.create({
      data: {
        denom,
        sale_type: saleType,
        tx_hash: txHash,
        created_date: createdDate.toJSDate(),
        end_date: endDate?.toJSDate(),
        start_date: startDate?.toJSDate(),
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
    denom,
    createdDate
  }: CreateNftOffer) {
    return this.prisma.nftOffer.create({
      data: {
        tx_hash: txHash,
        nft_id: nftId,
        end_date: endDate.toJSDate(),
        price,
        denom,
        start_date: startDate.toJSDate(),
        created_date: createdDate.toJSDate(),
        buyer_address: buyerAddress
      }
    });
  }

  public deleteNftOffer(id: number) {
    return this.prisma.nftOffer.delete({
      where: {
        id
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
    buyerAddress,
    createdDate
  }: CreateNftActivityParam) {
    return this.prisma.nftActivity.create({
      data: {
        denom,
        event_kind: eventKind,
        seller_address: sellerAddress,
        metadata,
        price,
        tx_hash: txHash,
        buyer_address: buyerAddress,
        date: createdDate.toJSDate(),
        Nft: {
          connect: {
            id: nftId
          }
        }
      }
    });
  }

  public async findHighestNftOfferExcludeSelfOffer(
    nftId: number,
    excludeBuyer: string
  ) {
    const highestOffer = await this.prisma.nftOffer.findMany({
      where: {
        nft_id: nftId,
        buyer_address: {
          not: excludeBuyer
        }
      },
      orderBy: {
        price: "desc"
      },
      take: 1
    });

    if (!highestOffer.length) {
      return undefined;
    }

    return highestOffer[0];
  }

  public findNftOfferByTokenAddressTokenIdBuyerAndPrice(
    tokenAddress: string,
    tokenId: string,
    buyer: string,
    price: number
  ) {
    return this.prisma.nftOffer.findFirst({
      where: {
        Nft: {
          token_address: tokenAddress,
          token_id: tokenId
        },
        buyer_address: buyer,
        price
      }
    });
  }

  public createNftBidding({
    buyerAddress,
    listing,
    price,
    txHash,
    createdDate
  }: CreateNftBiddingParams) {
    return this.prisma.nftBidding.create({
      data: {
        buyer_address: buyerAddress,
        denom: listing.denom,
        price,
        tx_hash: txHash,
        listing_id: listing.id,
        created_date: createdDate.toJSDate()
      }
    });
  }

  public deleteNftBidding(buyerAddress: string, listing: ListingNft) {
    return this.prisma.nftBidding.deleteMany({
      where: {
        buyer_address: buyerAddress,
        listing_id: listing.id
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
        id: listing.id
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
        id: listing.id
      }
    });
  }

  public findListingsBySellerAddress(sellerAddress: string) {
    return this.prisma.listingNft.findMany({
      where: {
        seller_address: sellerAddress
      },
      include: {
        Nft: true
      }
    });
  }

  public updateOwner({
    ownerAddress,
    tokenAddress,
    tokenId
  }: UpdateOwnerParams) {
    return this.prisma.nft.update({
      data: {
        owner_address: ownerAddress
      },
      where: {
        token_address_token_id: {
          token_address: tokenAddress,
          token_id: tokenId
        }
      }
    });
  }

  public async findPagedNftsByOwner(
    ownerAddress: string,
    {
      page,
      sortByPrice,
      status,
      take,
      search,
      collectionAddress
    }: GetNftsByOwnerQuery
  ) {
    const filter: Prisma.NftWhereInput = {};

    if (collectionAddress) {
      filter.token_address = collectionAddress;
    }

    if (search) {
      filter.AND = {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            token_id: {
              contains: search,
              mode: "insensitive"
            }
          }
        ]
      };
    }

    if (status === "all") {
      filter.OR = [
        { owner_address: ownerAddress },
        {
          Listing: {
            seller_address: ownerAddress
          }
        }
      ];
    } else if (status === "listed") {
      filter.Listing = {
        seller_address: ownerAddress
      };
    } else {
      filter.owner_address = ownerAddress;
    }

    const [nfts, total] = await Promise.all([
      this.prisma.nft.findMany({
        where: filter,
        include: {
          Listing: true,
          Collection: {
            select: {
              royalty: true
            }
          }
        },
        take,
        skip: (page - 1) * take,
        orderBy: {
          Listing: {
            price: sortByPrice
          }
        }
      }),
      this.prisma.nft.count({
        where: filter
      })
    ]);

    return { nfts, total };
  }
}
