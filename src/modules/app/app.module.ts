import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../../libs/prisma/prisma.module";
import { CollectionModule } from "../collection/collection.module";
import { NftModule } from "../nft/nft.module";
import { UserModule } from "../user/user.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `./config/.${process.env.APP || "local"}.env`,
      isGlobal: true
    }),
    CollectionModule,
    NftModule,
    PrismaModule,
    UserModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
