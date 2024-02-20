import type { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

type NftInfo = {
  token_uri: string | null;
};

export const getNftInfo = (
  client: CosmWasmClient,
  contractAddress: string,
  tokenId: string
): Promise<NftInfo> =>
  client.queryContractSmart(contractAddress, {
    nft_info: {
      token_id: tokenId
    }
  });
