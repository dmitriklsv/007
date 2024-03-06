import type { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

import { querySmartContract } from "../http/query-smart-contract";

type ContractInfo = {
  name: string;
  symbol: string;
};

export const getContractInfo = (
  client: CosmWasmClient,
  contractAddress: string
): Promise<ContractInfo> =>
  client.queryContractSmart(contractAddress, {
    contract_info: {}
  });

type GetContractInfoVRestApiParams = {
  restApiUrl: string;
  xApiKey: string;
  contractAddress: string;
};

export const getContractInfoVRestApi = ({
  contractAddress,
  restApiUrl,
  xApiKey
}: GetContractInfoVRestApiParams) =>
  querySmartContract<ContractInfo>(restApiUrl, xApiKey)(contractAddress, {
    contract_info: {}
  });
