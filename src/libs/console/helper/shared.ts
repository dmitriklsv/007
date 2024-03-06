import { v4 } from "uuid";

import { base64ToUtf8 } from "@root/utils/base64-to-utf8";
import { intoError } from "@root/utils/into-error.util";

import type { MessageResponse, WasmEvents } from "./type";

export const CWR721ACTIONS = {
  SendNft: "send_nft",
  MintNft: "mint",
  TransferNft: "transfer_nft"
} as const;

export type Cwr721Actions = (typeof CWR721ACTIONS)[keyof typeof CWR721ACTIONS];

export const MRKT_MARKETPLACE_ACTIONS = {
  StartSale: "start_sale",
  AcceptOffer: "accept_offer",
  AcceptSale: "accept_sale",
  CancelSale: "cancel_sale",
  MakeCollectionOffer: "make_collection_offer",
  CancelCollectionOffer: "cancel_collection_offer",
  FixedSell: "fixed_sell",
  Bidding: "bidding",
  EditSale: "edit_sale",
  CancelBidding: "cancel_propose"
} as const;

export type MrktMarketplaceActions =
  (typeof MRKT_MARKETPLACE_ACTIONS)[keyof typeof MRKT_MARKETPLACE_ACTIONS];

export const findEventsByAction = (
  events: WasmEvents,
  action: MrktMarketplaceActions
) =>
  events.filter(
    event =>
      !!event.attributes.find(
        attribute => attribute.key === "action" && attribute.value === action
      )
  );

export const findAction = (
  actions: Array<string>
): MrktMarketplaceActions | undefined =>
  Object.values(MRKT_MARKETPLACE_ACTIONS).find(action =>
    actions.includes(action)
  );

export const findAttributeByKey = (event: WasmEvents[number], key: string) => {
  const attribute = event.attributes.find(attribute => attribute.key === key);
  if (attribute) {
    return attribute.value;
  }

  return undefined;
};

export const createSubscribeMessage = (contractAddress: string) =>
  JSON.stringify({
    jsonrpc: "2.0",
    method: "subscribe",
    id: v4().toString(),
    params: {
      query: `tm.event = 'Tx' AND wasm._contract_address='${contractAddress}'`
    }
  });

export const retrieveWasmEvents = (messageResponse: MessageResponse) => {
  const wasmEvents = messageResponse.result.data?.value?.TxResult?.result.events
    .filter(event => event.type === "wasm")
    .map(({ attributes, type }) => {
      const attributesInUtf8 = attributes.map(({ key, value }) => ({
        key: base64ToUtf8(key),
        value: base64ToUtf8(value)
      }));

      return {
        type,
        attributes: attributesInUtf8
      };
    });

  return wasmEvents;
};

export const retrieveErrorMessage = (error: unknown) =>
  intoError(error).message;
