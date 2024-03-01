import { Injectable } from "@nestjs/common";

import { PrismaService } from "@root/libs/prisma/prisma.service";
import type { GetCollectionOffersQuery } from "@root/modules/collection/parsers/get-collection-offers.parser";

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
  startDate: Date;
  endDate: Date;
  txHash: string;
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

  public createCollectionOffer({
    address,
    buyerAddress,
    endDate,
    price,
    quantity,
    startDate,
    txHash,
    denom
  }: CreateCollectionOffer) {
    return this.prisma.collectionOffer.create({
      data: {
        tx_hash: txHash,
        collection_address: address,
        end_date: endDate,
        price,
        quantity,
        denom,
        start_date: startDate,
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

  public deleteCollectionOffer(address: string, buyerAddress: string) {
    return this.prisma.collectionOffer.delete({
      where: {
        collection_address_buyer_address: {
          collection_address: address,
          buyer_address: buyerAddress
        },
        status: "pending"
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
          buyer_address: walletAddress,
          status: "pending"
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

  public findHighestCollectionOffer(
    collectionAddress: string,
    buyerAddress: string
  ) {
    return this.prisma.collectionOffer.findMany({
      where: {
        collection_address: collectionAddress,
        buyer_address: {
          not: buyerAddress // exclude their owned offers
        },
        status: "pending"
      },
      orderBy: {
        price: "desc"
      },
      take: 1
    });
  }

  public findCollectionOfferByBuyerAddressAndCollectionAddress(
    buyerAddress: string,
    collectionAddress: string
  ) {
    return this.prisma.collectionOffer.findUnique({
      where: {
        collection_address_buyer_address: {
          buyer_address: buyerAddress,
          collection_address: collectionAddress
        },
        status: "pending"
      }
    });
  }

  public updateCollectionOfferProcess(
    buyerAddress: string,
    collectionAddress: string
  ) {
    return this.prisma.collectionOffer.update({
      where: {
        collection_address_buyer_address: {
          collection_address: collectionAddress,
          buyer_address: buyerAddress
        },
        status: "pending"
      },
      data: {
        current_quantity: {
          increment: 1
        }
      }
    });
  }

  public completeCollectionOffer(
    buyerAddress: string,
    collectionAddress: string
  ) {
    return this.prisma.collectionOffer.update({
      where: {
        collection_address_buyer_address: {
          collection_address: collectionAddress,
          buyer_address: buyerAddress
        }
      },
      data: {
        status: "done"
      }
    });
  }
}
