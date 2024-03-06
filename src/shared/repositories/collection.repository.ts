import { Injectable } from "@nestjs/common";
import type { CollectionOffer } from "@prisma/client";
import type { DateTime } from "luxon";

import { PrismaService } from "@root/libs/prisma/prisma.service";
import type { GetCollectionOffersQuery } from "@root/modules/collection/parsers/get-collection-offers";
import type { GetListedNftsByCollectionQuery } from "@root/modules/collection/parsers/get-listed-nfts-by-collection";

type CreateCollectionParams = {
  address: string;
  name: string;
  symbol: string;
  description?: string;
};

type CreateCollectionOffer = {
  address: string;
  buyerAddress: string;
  price: number;
  denom: string;
  quantity: number;
  startDate: DateTime;
  endDate: DateTime;
  txHash: string;
  createdDate: DateTime;
};

type FindPagedCollectionViewsParams = {
  take: number;
  page: number;
  ownerAddress?: string;
  search?: string;
};

@Injectable()
export class CollectionRepository {
  constructor(private prisma: PrismaService) {}

  public create({
    address,
    name,
    symbol,
    description
  }: CreateCollectionParams) {
    return this.prisma.collection.create({
      data: {
        address,
        name,
        symbol,
        description
      }
    });
  }

  public findByAddress(address: string) {
    return this.prisma.collection.findUnique({
      where: {
        address
      }
    });
  }

  public findAllCollectionAddress() {
    return this.prisma.collection.findMany({
      select: {
        address: true
      }
    });
  }

  public createCollectionOffer({
    address,
    buyerAddress,
    endDate,
    price,
    quantity,
    startDate,
    txHash,
    denom,
    createdDate
  }: CreateCollectionOffer) {
    return this.prisma.collectionOffer.create({
      data: {
        tx_hash: txHash,
        collection_address: address,
        end_date: endDate.toJSDate(),
        price,
        quantity,
        denom,
        start_date: startDate.toJSDate(),
        created_date: createdDate.toJSDate(),
        Buyer: {
          connectOrCreate: {
            create: {
              address: buyerAddress
            },
            where: {
              address: buyerAddress
            }
          }
        }
      }
    });
  }

  public deleteCollectionOfferByCollectionAddressBuyerAndPrice(
    collectionAddress: string,
    buyerAddress: string,
    price: number
  ) {
    return this.prisma.collectionOffer.deleteMany({
      where: {
        collection_address: collectionAddress,
        buyer_address: buyerAddress,
        price
      }
    });
  }

  public async findPagedCollectionOffers(
    collectionAddress: string,
    { page, take, walletAddress }: GetCollectionOffersQuery
  ) {
    const [nodes, total] = await Promise.all([
      this.prisma.collectionOffer.findMany({
        where: {
          collection_address: collectionAddress,
          buyer_address: walletAddress
        },
        take,
        skip: (page - 1) * take
      }),
      this.prisma.collectionOffer.count({
        where: {
          collection_address: collectionAddress,
          buyer_address: walletAddress
        }
      })
    ]);

    return { nodes, total };
  }

  public async findHighestCollectionOfferExcludeSelfOffer(
    collectionAddress: string,
    excludeBuyer: string
  ) {
    const highestOffer = await this.prisma.collectionOffer.findMany({
      where: {
        collection_address: collectionAddress,
        buyer_address: {
          not: excludeBuyer // exclude their owned offers
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

  public updateCollectionOfferProcess(collectionOffer: CollectionOffer) {
    return this.prisma.collectionOffer.update({
      where: {
        id: collectionOffer.id
      },
      data: {
        current_quantity: {
          increment: 1
        }
      }
    });
  }

  public async findPagedListedNftsByCollectionAddress(
    collectionAddress: string,
    { page, take, sortByPrice }: GetListedNftsByCollectionQuery
  ) {
    const [listings, total] = await Promise.all([
      this.prisma.listingNft.findMany({
        where: {
          Nft: {
            token_address: collectionAddress
          }
        },
        include: {
          Nft: true
        },
        take,
        skip: (page - 1) * take,
        orderBy: [
          {
            price: sortByPrice
          },
          {
            start_date: "desc"
          }
        ]
      }),
      this.prisma.listingNft.count({
        where: {
          Nft: {
            token_address: collectionAddress
          }
        }
      })
    ]);

    return { listings, total };
  }

  public findCollectionsByOwner(walletAddress: string) {
    return this.prisma.collection.findMany({
      where: {
        Nfts: {
          some: {
            owner_address: walletAddress
          }
        }
      },
      select: {
        address: true
      }
    });
  }

  public async findPagedCollectionViews({
    page,
    take,
    ownerAddress,
    search
  }: FindPagedCollectionViewsParams) {
    let addresses: Array<string> | undefined;

    if (ownerAddress) {
      addresses = await this.prisma.collection
        .findMany({
          where: {
            Nfts: {
              some: {
                OR: [
                  { owner_address: ownerAddress },
                  {
                    Listing: {
                      seller_address: ownerAddress
                    }
                  }
                ]
              }
            }
          },
          select: {
            address: true
          }
        })
        .then(collections => collections.map(({ address }) => address));
    }

    console.log("addresses: ", addresses);

    const [collections, total] = await Promise.all([
      this.prisma.collectionView.findMany({
        where: {
          name: {
            contains: search,
            mode: "insensitive"
          },
          address: {
            in: addresses
          }
        },
        take,
        skip: (page - 1) * take
      }),
      this.prisma.collection.count({
        where: {
          name: {
            contains: search,
            mode: "insensitive"
          },
          address: {
            in: addresses
          }
        }
      })
    ]);

    return { collections, total };
  }
}
