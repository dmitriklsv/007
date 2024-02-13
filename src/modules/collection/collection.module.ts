import { Module } from "@nestjs/common";

import { PrismaModule } from "@root/libs/prisma/prisma.module";

import { CollectionController } from "./collection.controller";
import { CollectionService } from "./collection.service";

@Module({
  controllers: [CollectionController],
  providers: [CollectionService],
  imports: [PrismaModule]
})
export class CollectionModule {}
