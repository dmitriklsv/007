import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { Command, CommandRunner } from "nest-commander";

import { getNftInfo } from "@root/shared/services/query-contract/get-nft-info";

import { PrismaService } from "../prisma/prisma.service";
import { InjectCosmWasmClient } from "../secret/secret.module";

@Command({
  name: "execute"
})
export class TriggerConsole extends CommandRunner {
  constructor(
    private prisma: PrismaService,
    @InjectCosmWasmClient() private client: CosmWasmClient
  ) {
    super();
  }

  async run(): Promise<void> {
    const allCollection = await this.prisma.collection.findMany({
      select: { address: true }
    });

    await Promise.allSettled(
      allCollection.map(async ({ address }) => {
        const nft = await this.prisma.nft.findFirst({
          where: {
            token_address: address
          },
          select: {
            token_id: true
          }
        });

        if (!nft) {
          return;
        }

        const nft_info = await getNftInfo(this.client, address, nft.token_id);

        await this.prisma.collection.update({
          data: {
            royalty: nft_info.extension.royalty_percentage
          },
          where: {
            address
          }
        });
      })
    );
  }
}
