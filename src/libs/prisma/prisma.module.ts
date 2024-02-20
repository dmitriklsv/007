import { Global, Module } from "@nestjs/common";

import { CollectionRepository } from "@root/shared/repositories/collection.repository";
import { NftRepository } from "@root/shared/repositories/nft.repository";

import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService, CollectionRepository, NftRepository],
  exports: [CollectionRepository, NftRepository]
})
export class PrismaModule {}
