import { Injectable } from "@nestjs/common";

import { PrismaService } from "@root/libs/prisma/prisma.service";

type CreateCollectionParams = {
  address: string;
  name: string;
  symbol: string;
  description?: string;
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
}
