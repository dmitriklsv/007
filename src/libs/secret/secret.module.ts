import type { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { Global, Inject, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { readConfigOrThrow } from "@root/shared/helper/read-config";

export type Secrets = {
  xApiKey: string;
  rpcUrl: string;
  wssUrl: string;
  mrktContractAddress: string;
  restApiUrl: string;
  palletApiUrl: string;
};

export const SecretsToken: unique symbol = Symbol("SecretsToken");

export const CosmWasmClientToken: unique symbol = Symbol("CosmWasmClientToken");

export const InjectSecrets = () => Inject(SecretsToken);

export const InjectCosmWasmClient = () => Inject(CosmWasmClientToken);

@Global()
@Module({
  providers: [
    {
      provide: SecretsToken,
      useFactory: (configService: ConfigService): Secrets => {
        const xApiKey = readConfigOrThrow("X_API_KEY")(configService);
        const rpcUrl = readConfigOrThrow("RPC_URL")(configService);
        const wssUrl = readConfigOrThrow("RPC_WSS_URL")(configService);
        const mrktContractAddress = readConfigOrThrow("MRKT_CONTRACT_ADDRESS")(
          configService
        );
        const restApiUrl = readConfigOrThrow("REST_API_URL")(configService);
        const palletApiUrl = readConfigOrThrow("PALLET_API_URL")(configService);

        return {
          xApiKey,
          rpcUrl,
          wssUrl,
          mrktContractAddress,
          restApiUrl,
          palletApiUrl
        };
      },
      inject: [ConfigService]
    },
    {
      provide: CosmWasmClientToken,
      useFactory: async (
        configService: ConfigService
      ): Promise<CosmWasmClient> => {
        try {
          const rpc = readConfigOrThrow("RPC_URL")(configService);
          const client = await SigningCosmWasmClient.connect(rpc);
          return client;
        } catch {
          throw new Error("Can not connect to Tendermint");
        }
      },
      inject: [ConfigService]
    }
  ],
  exports: [SecretsToken, CosmWasmClientToken],
  imports: [
    ConfigModule.forRoot({
      envFilePath: `./config/.${process.env.APP || "local"}.env`
    })
  ]
})
export class SecretModule {}
