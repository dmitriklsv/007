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
            coalesce(count("n"."id"),0) "supply",
            coalesce(count("l"."id"),0) "listed",
            coalesce(min("l"."price"),0) "floor_price",
            (
                SELECT coalesce(sum("t"."volume"),0)
                FROM "transaction" "t"
                WHERE "t"."collection_address" = "c"."address"
            ) "volume",
            (
                SELECT coalesce(sum("t"."volume"),0)
                FROM "transaction" "t"
                WHERE "t"."collection_address" = "c"."address"
                AND "t"."date" > NOW() - INTERVAL '1 hour'
            ) "volume_of_1h",
            (
                SELECT coalesce(sum("t"."volume"),0)
                FROM "transaction" "t"
                WHERE "t"."collection_address" = "c"."address"
                AND "t"."date" > NOW() - INTERVAL '1 day'
            ) "volume_of_24h",
            (
                SELECT coalesce(sum("t"."volume"),0)
                FROM "transaction" "t"
                WHERE "t"."collection_address" = "c"."address"
                AND "t"."date" > NOW() - INTERVAL '7 days'
            ) "volume_of_7d"
        FROM "collection" "c"
        LEFT JOIN "nft" "n" ON "n"."token_address" = "c"."address"
        LEFT JOIN "listing_nft" "l" ON "l"."nft_id" = "n"."id"
        GROUP BY "c"."address"
    `;
  }
}
