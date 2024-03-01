import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "@root/libs/prisma/prisma.service";

@Injectable()
export class BlockRepository {
  constructor(private prisma: PrismaService) {}

  public create(data: Prisma.BlockCreateInput) {
    return this.prisma.block.create({
      data
    });
  }
}
