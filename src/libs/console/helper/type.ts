import type { SaleType } from "@prisma/client";
import type { DateTime } from "luxon";

export type CreateListing = {
  txHash: string;
  tokenAddress: string;
  tokenId: string;
  price: number;
  denom: string;
  saleType: SaleType;
  sellerAddress: string;
  collectionAddress: string;
  createdDate: DateTime;
  minBidIncrementPercent?: number;
  startDate?: DateTime;
  endDate?: DateTime;
};

export type ContractEvent = Readonly<{
  type: string;
  attributes: ReadonlyArray<{
    key: string;
    value: string;
  }>;
}>;

export type MessageResponse = {
  jsonrpc: string;
  id: string;
  result: {
    data?: {
      value?: {
        TxResult?: {
          height: string;
          result: {
            events: Array<ContractEvent>;
          };
        };
      };
    };
    events?: Record<string, Array<string>>;
  };
};

export type WasmEvents = Array<ContractEvent>;
