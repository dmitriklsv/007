import type { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

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
