import { Module } from "@nestjs/common";

import { SecretModule } from "@root/libs/secret/secret.module";

import { PrismaModule } from "../../libs/prisma/prisma.module";
import { CollectionModule } from "../collection/collection.module";
import { NftModule } from "../nft/nft.module";
import { UserModule } from "../user/user.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    SecretModule,
    CollectionModule,
    NftModule,
    PrismaModule,
    UserModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
