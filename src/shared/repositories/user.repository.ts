import { Injectable } from "@nestjs/common";

import { PrismaService } from "@root/libs/prisma/prisma.service";

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  public create(walletAddress: string) {
    return this.prisma.user.create({
      data: {
        address: walletAddress
      }
    });
  }

  public findByWalletAddress(walletAddress: string) {
    return this.prisma.user.findUnique({
      where: {
        address: walletAddress
      }
    });
  }

  public findAll() {
    return this.prisma.user.findMany({
      select: {
        address: true
      }
    });
  }
}
