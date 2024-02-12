import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { BasicConsole } from "./basic.console";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `./config/.${process.env.APP || "local"}.env`
    })
  ],
  providers: [BasicConsole]
})
export class ConsoleModule {}
