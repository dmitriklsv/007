import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CollectionModule } from "./modules/collection/collection.module";
import { NftModule } from "./modules/nft/nft.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `./config/.${process.env.APP || "local"}.env`,
      isGlobal: true
    }),
    CollectionModule,
    NftModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
