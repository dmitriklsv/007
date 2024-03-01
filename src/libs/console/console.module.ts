import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../prisma/prisma.module";
import { StreamConsole } from "./stream.console";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `./config/.${process.env.APP || "local"}.env`
    }),
    PrismaModule
  ],
  providers: [StreamConsole]
})
export class ConsoleModule {}
