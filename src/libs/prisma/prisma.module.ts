import { Global, Module } from "@nestjs/common";

import { CollectionRepository } from "@root/shared/repositories/collection.repository";
import { ConfigRepository } from "@root/shared/repositories/config.repository";
import { NftRepository } from "@root/shared/repositories/nft.repository";
import { TracingRepository } from "@root/shared/repositories/tracing.repository";
import { TransactionRepository } from "@root/shared/repositories/transaction.repository";
import { UserRepository } from "@root/shared/repositories/user.repository";

import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [
    PrismaService,
    CollectionRepository,
    NftRepository,
    TracingRepository,
    TransactionRepository,
    UserRepository,
    ConfigRepository
  ],
  exports: [
    PrismaService,
    CollectionRepository,
    NftRepository,
    TracingRepository,
    TransactionRepository,
    UserRepository,
    ConfigRepository
  ]
})
export class PrismaModule {}
