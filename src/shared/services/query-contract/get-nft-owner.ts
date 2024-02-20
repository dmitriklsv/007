import type { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

type NftOwner = {
  owner: string;
};

export const getNftOwner = (
  client: CosmWasmClient,
  contractAddress: string,
  tokenId: string
): Promise<NftOwner> =>
  client.queryContractSmart(contractAddress, {
    owner_of: {
      token_id: tokenId
    }
  });
