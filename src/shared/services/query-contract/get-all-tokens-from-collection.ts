import type { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

type GetAllTokensFromContractResponse = {
  tokens: Array<string>;
};

export const getAllTokensFromContract = (
  client: CosmWasmClient,
  contractAddress: string
): Promise<GetAllTokensFromContractResponse> =>
  client.queryContractSmart(contractAddress, {
    all_tokens: {}
  });
