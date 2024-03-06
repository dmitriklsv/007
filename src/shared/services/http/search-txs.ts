import axios from "axios";
import { v4 as uuid } from "uuid";

import type { ContractEvent } from "@root/libs/console/helper/type";

type SearchTxParams = {
  rpcUrl: string;
  currentHeight: number;
};

export type Tx = {
  hash: string;
  height: string;
  tx_result: {
    events: Array<ContractEvent>;
  };
};

type SearchTxResponse = {
  jsonrpc: string;
  id: string;
  result: {
    txs: Array<Tx>;
    total_count: number;
  };
};

export const searchTxs = ({ currentHeight, rpcUrl }: SearchTxParams) =>
  axios
    .post<SearchTxResponse>(rpcUrl, {
      jsonrpc: "2.0",
      id: uuid().toString(),
      method: "tx_search",
      params: {
        query: `tx.height='${currentHeight}'`,
        page: "1"
      }
    })
    .then(response => response.data.result.txs);
