import axios from "axios";

type ListAllOwnedNfts = {
  address: string;
  nfts: Array<{
    collection: {
      contract_address: string;
      symbol: string;
    };
    id: string;
    name: string;
    image: string;
  }>;
};

export const getOwnedNftsByAddress = (
  palletApiUrl: string,
  walletAddress: string
) => {
  return axios
    .get<ListAllOwnedNfts>(`${palletApiUrl}/v1/user/${walletAddress}`, {
      params: {
        include_tokens: true,
        include_bids: true,
        fetch_nfts: true
      }
    })
    .then(response => response.data);
};
