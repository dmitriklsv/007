import type { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

import { querySmartContract } from "../http/query-smart-contract";

type NftInfo = {
  token_uri: string;
  extension: {
    royalty_percentage: number;
  };
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

type GetNftInfoVRestApiParams = {
  restApiUrl: string;
  xApiKey: string;
  contractAddress: string;
  tokenId: string;
};

export const getNftInfoVRestApi = ({
  contractAddress,
  restApiUrl,
  tokenId,
  xApiKey
}: GetNftInfoVRestApiParams) =>
  querySmartContract<NftInfo>(restApiUrl, xApiKey)(contractAddress, {
    nft_info: {
      token_id: tokenId
    }
  });
