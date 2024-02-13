import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "@root/libs/prisma/prisma.service";
import type { CollectionEntity } from "@root/modules/collection/collection.entity";

@Injectable()
export class CollectionRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(
    page: number,
    pageSize: number,
    searchString: string
  ): Promise<CollectionEntity[]> {
    const offset = (page - 1) * pageSize;
    let whereCause = {};

    if (searchString) {
      whereCause = { name: { contains: searchString } };
    }

    const collections = await this.prisma.collection.findMany({
      where: whereCause,
      take: Number(pageSize),
      skip: Number(offset),
      orderBy: {
        name: "asc"
      }
    });

    return collections;
  }

  async findOne(address: string): Promise<CollectionEntity> {
    const collection = await this.prisma.collection.findUnique({
      where: { address: address }
    });

    if (!collection) {
      throw new NotFoundException("Collection not found");
    }

    return collection;
  }

  async getCount(searchString: string): Promise<number> {
    let whereCause = {};
    if (searchString) {
      whereCause = { name: { contains: searchString } };
    }

    const totalCount = await this.prisma.collection.count({
      where: whereCause
    });

    return totalCount;
  }
}
