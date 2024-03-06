import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { SecretModule } from "../secret/secret.module";
import { BlockScannerConsole } from "./block-scaner.console";
import { ConsoleService } from "./console.service";
import { StreamConsole } from "./stream.console";
import { TriggerConsole } from "./trigger.console";

@Module({
  imports: [SecretModule, PrismaModule],
  providers: [
    ConsoleService,
    StreamConsole,
    TriggerConsole,
    BlockScannerConsole
  ]
})
export class ConsoleModule {}
