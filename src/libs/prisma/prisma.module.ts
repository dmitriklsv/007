import { Global, Module } from "@nestjs/common";

import { BlockRepository } from "@root/shared/repositories/block.repository";
import { CollectionRepository } from "@root/shared/repositories/collection.repository";
import { NftRepository } from "@root/shared/repositories/nft.repository";
import { TransactionRepository } from "@root/shared/repositories/transaction.repository";

import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [
    PrismaService,
    CollectionRepository,
    NftRepository,
    BlockRepository,
    TransactionRepository
  ],
  exports: [
    PrismaService,
    CollectionRepository,
    NftRepository,
    BlockRepository,
    TransactionRepository
  ]
})
export class PrismaModule {}
