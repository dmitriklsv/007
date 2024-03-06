import { querySmartContract } from "../http/query-smart-contract";

type Tokens = {
  tokens: Array<string>;
};

// export const getAllOwnedNffOnContract = (
//   client: CosmWasmClient,
//   contractAddress: string,
//   walletAddress: string
// ): Promise<Tokens> =>
//   client.queryContractSmart(contractAddress, {
//     tokens: {
//       owner: walletAddress
//     }
//   });

type GetAllOwnedNffOnContractParams = {
  restApiUrl: string;
  xApiKey: string;
  contractAddress: string;
  walletAddress: string;
};

export const getAllOwnedNffOnContract = ({
  contractAddress,
  walletAddress,
  restApiUrl,
  xApiKey
}: GetAllOwnedNffOnContractParams) =>
  querySmartContract<Tokens>(restApiUrl, xApiKey)(contractAddress, {
    tokens: {
      owner: walletAddress
    }
  });
