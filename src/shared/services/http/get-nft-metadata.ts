import axios from "axios";

type NftMetadata = {
  description: string;
  external_url: string;
  image: string;
  name: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
};

export const getNftMetadata = (tokenUri: string) =>
  axios.get<NftMetadata>(tokenUri).then(response => response.data);
