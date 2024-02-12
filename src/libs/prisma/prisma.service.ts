import type { OnModuleInit } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, "query">
  implements OnModuleInit
{
  constructor() {
    super({
      log: [
        {
          emit: "event",
          level: "query"
        },
        {
          emit: "stdout",
          level: "error"
        },
        {
          emit: "stdout",
          level: "info"
        },
        {
          emit: "stdout",
          level: "warn"
        }
      ],
      errorFormat: "pretty"
    });
  }

  async onModuleInit() {
    if (process.env.LOG_QUERY === "1") {
      this.$on("query", event => {
        console.log("#Query: ", event.query);
        console.log("#Params: ", event.params);
        console.log("#Duration: ", event.duration);
      });
    }

    await this.$connect();
  }
}
