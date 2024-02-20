import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../prisma/prisma.module";
import { BasicConsole } from "./basic.console";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `./config/.${process.env.APP || "local"}.env`
    }),
    PrismaModule
  ],
  providers: [BasicConsole]
})
export class ConsoleModule {}
