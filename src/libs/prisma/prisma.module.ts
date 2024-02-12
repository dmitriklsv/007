import { Global, Module } from "@nestjs/common";

import { CollectionRepository } from "@root/shared/repositories/collection.repository";

import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService, CollectionRepository],
  exports: [CollectionRepository]
})
export class PrismaModule {}
