import type { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

type NumTokens = {
  count: number;
};

export const getNumTokensOfCollection = (
  client: CosmWasmClient,
  contractAddress: string
): Promise<NumTokens> =>
  client.queryContractSmart(contractAddress, {
    num_tokens: {}
  });
