import axios from "axios";

export type NftAttribute = {
  trait_type?: string;
  type?: string;
  value?: string | number;
  display_type?: string;
};

type NftMetadata = {
  description?: string;
  external_url?: string;
  image?: string;
  name?: string;
  attributes?: Array<NftAttribute>;
};

export const getNftMetadata = async (tokenUri: string) => {
  try {
    const metadata = await axios
      .get<NftMetadata>(tokenUri)
      .then(response => response.data);

    return metadata;
  } catch (error) {
    return {};
  }
};
