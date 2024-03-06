import type { JsonObject } from "@cosmjs/cosmwasm-stargate";
import axios from "axios";

export const querySmartContract =
  <T>(restApiUrl: string, xApiKey: string) =>
  async (contractAddress: string, queryMessage: JsonObject) => {
    const queryB64Encoded = Buffer.from(JSON.stringify(queryMessage)).toString(
      "base64"
    );
    const response = await axios.get<{ data: T }>(
      `${restApiUrl}/cosmwasm/wasm/v1/contract/${contractAddress}/smart/${queryB64Encoded}`,
      {
        headers: {
          "x-apikey": xApiKey
        }
      }
    );

    return response.data.data;
  };
