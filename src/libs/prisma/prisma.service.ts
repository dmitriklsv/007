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
    await this.createCollectionView();
  }

  private async createCollectionView() {
    await this.$executeRaw`
        CREATE OR REPLACE VIEW "collection_view" AS
        SELECT 
            "c".*,
            count("n"."id") "supply",
            min("n"."price") "floor_price",
            (
                SELECT sum("t"."volume")
                FROM "transaction" "t"
                WHERE "t"."nft_id" IN (SELECT id FROM nft WHERE contract_address = "c"."address")
            ) "volume",
            (
                SELECT sum("t"."volume")
                FROM "transaction" "t"
                WHERE "t"."nft_id" IN (SELECT id FROM nft WHERE contract_address = "c"."address")
                AND "t"."date" > NOW() - INTERVAL '1 hour'
            ) "volume_of_1h",
            (
                SELECT sum("t"."volume")
                FROM "transaction" "t"
                WHERE "t"."nft_id" IN (SELECT id FROM nft WHERE contract_address = "c"."address")
                AND "t"."date" > NOW() - INTERVAL '1 day'
            ) "volume_of_24h",
            (
                SELECT sum("t"."volume")
                FROM "transaction" "t"
                WHERE "t"."nft_id" IN (SELECT id FROM nft WHERE contract_address = "c"."address")
                AND "t"."date" > NOW() - INTERVAL '7 days'
            ) "volume_of_7d"
        FROM "collection" "c"
        LEFT JOIN "nft" "n" on "n"."contract_address" = "c"."address"
        GROUP BY "c"."address"
    `;
  }
}
