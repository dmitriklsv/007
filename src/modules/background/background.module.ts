import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";

import { PrismaModule } from "@root/libs/prisma/prisma.module";

import { BackgroundService } from "./background.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `./config/.${process.env.APP || "local"}.env`,
      isGlobal: true
    }),
    ScheduleModule.forRoot(),
    PrismaModule
  ],
  providers: [BackgroundService]
})
export class BackgroundModule {}
