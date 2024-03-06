import { DateTime } from "luxon";
import { Command, CommandRunner } from "nest-commander";
import WebSocket from "ws";

import { TracingRepository } from "@root/shared/repositories/tracing.repository";

import { InjectSecrets, Secrets } from "../secret/secret.module";
import { ConsoleService } from "./console.service";
import {
  MRKT_MARKETPLACE_ACTIONS,
  createSubscribeMessage,
  findAction,
  findEventsByAction,
  retrieveErrorMessage,
  retrieveWasmEvents
} from "./helper/shared";
import type { MessageResponse, WasmEvents } from "./helper/type";

@Command({
  name: "listen-stream"
})
export class StreamConsole extends CommandRunner {
  constructor(
    private consoleService: ConsoleService,
    private tracingRepository: TracingRepository,
    @InjectSecrets() private secrets: Secrets
  ) {
    super();
  }

  run(): Promise<void> {
    this.listenStream();
    return Promise.resolve(void 0);
  }

  private listenStream() {
    const websocket = new WebSocket(this.secrets.wssUrl);

    websocket.on("open", () => {
      websocket.send(createSubscribeMessage(this.secrets.mrktContractAddress));
      console.log(
        `Listening contract logs stream: ${this.secrets.mrktContractAddress}`
      );
    });

    websocket.on("error", error => {
      console.error("On socket error: ", error);
      websocket.close();
    });

    websocket.on("close", () => {
      console.log(
        "Socket encountered error, closed socket try reconnect after 1ms..."
      );

      setTimeout(() => {
        this.listenStream();
        console.log("Reconnected");
      }, 1);
    });

    websocket.on("message", async raw => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messageResponse: MessageResponse = JSON.parse(raw as any) || {};

      const actions = messageResponse?.result?.events?.["wasm.action"] || [];
      const action = findAction(actions);
      const txHash = messageResponse?.result?.events?.["tx.hash"]?.[0];

      const wasmEvents = retrieveWasmEvents(messageResponse);

      if (!wasmEvents || !txHash || !action) {
        return;
      }

      try {
        switch (action) {
          case MRKT_MARKETPLACE_ACTIONS.StartSale:
            await this.onStartSale(wasmEvents, txHash);
            return;

          case MRKT_MARKETPLACE_ACTIONS.AcceptOffer:
            await this.onAcceptOffer(wasmEvents, txHash);
            return;

          case MRKT_MARKETPLACE_ACTIONS.CancelSale:
            await this.onCancelSale(wasmEvents, txHash);
            return;

          case MRKT_MARKETPLACE_ACTIONS.MakeCollectionOffer:
            await this.onMakeOffer(wasmEvents, txHash);
            return;

          case MRKT_MARKETPLACE_ACTIONS.CancelCollectionOffer:
            await this.onCancelOffer(wasmEvents, txHash);
            return;

          case MRKT_MARKETPLACE_ACTIONS.FixedSell:
            await this.onFixedSell(wasmEvents, txHash);
            return;

          case MRKT_MARKETPLACE_ACTIONS.Bidding:
            await this.onBidding(wasmEvents, txHash);
            return;

          case MRKT_MARKETPLACE_ACTIONS.EditSale:
            await this.onEditSale(wasmEvents, txHash);
            return;

          case MRKT_MARKETPLACE_ACTIONS.CancelBidding:
            await this.onCancelBidding(wasmEvents, txHash);
            return;

          case MRKT_MARKETPLACE_ACTIONS.AcceptSale:
            await this.onAcceptSale(wasmEvents, txHash);
            return;

          default:
            return;
        }
      } catch (error) {
        console.error(
          `Unexpected error when handle action ${action}: ${txHash}`
        );
        console.error(error);
      }
    });
  }

  //tested
  private async onStartSale(wasmEvents: WasmEvents, txHash: string) {
    const startSaleEvents = findEventsByAction(wasmEvents, "start_sale");

    for (const event of startSaleEvents) {
      try {
        await this.consoleService.handleStartSale(
          event,
          txHash,
          DateTime.now()
        );
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.StartSale,
          event,
          tx_hash: txHash
        });
      } catch (error) {
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.StartSale,
          event,
          tx_hash: txHash,
          is_failure: true,
          message: retrieveErrorMessage(error)
        });

        console.error(`Error when handle start_sale: ${txHash}`);
        console.error(error);
      }
    }
  }

  // tested
  private async onAcceptOffer(wasmEvents: WasmEvents, txHash: string) {
    const acceptOfferEvents = findEventsByAction(wasmEvents, "accept_offer");

    for (const event of acceptOfferEvents) {
      try {
        await this.consoleService.handlerAcceptOffer(
          event,
          txHash,
          DateTime.now()
        );
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.AcceptOffer,
          event,
          tx_hash: txHash
        });
      } catch (error) {
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.AcceptOffer,
          event,
          tx_hash: txHash,
          is_failure: true,
          message: retrieveErrorMessage(error)
        });

        console.error(`Error when handle accept_offer: ${txHash}`);
        console.error(error);
      }
    }
  }

  // tested
  private async onAcceptSale(wasmEvents: WasmEvents, txHash: string) {
    const acceptSaleEvents = findEventsByAction(wasmEvents, "accept_sale");

    for (const event of acceptSaleEvents) {
      try {
        await this.consoleService.handleAcceptSale(
          event,
          txHash,
          DateTime.now()
        );
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.AcceptSale,
          event,
          tx_hash: txHash
        });
      } catch (error) {
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.AcceptSale,
          event,
          tx_hash: txHash,
          is_failure: true,
          message: retrieveErrorMessage(error)
        });

        console.error(`Error when handle accept_sale: ${txHash}`);
        console.error(error);
      }
    }
  }

  // tested
  private async onCancelSale(wasmEvents: WasmEvents, txHash: string) {
    const cancelSaleEvents = findEventsByAction(wasmEvents, "cancel_sale");

    for (const event of cancelSaleEvents) {
      try {
        await this.consoleService.handleCancelSale(
          event,
          txHash,
          DateTime.now()
        );
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.CancelSale,
          event,
          tx_hash: txHash
        });
      } catch (error) {
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.CancelSale,
          event,
          tx_hash: txHash,
          is_failure: true,
          message: retrieveErrorMessage(error)
        });

        console.error(`Error when handle cancel_sale: ${txHash}`);
        console.error(error);
      }
    }
  }

  // include collection_offer and single_nft_offer
  // tested
  private async onMakeOffer(wasmEvents: WasmEvents, txHash: string) {
    const makeOfferEvents = findEventsByAction(
      wasmEvents,
      "make_collection_offer"
    );

    for (const event of makeOfferEvents) {
      try {
        await this.consoleService.handleMakeOffer(
          event,
          txHash,
          DateTime.now()
        );
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.MakeCollectionOffer,
          event,
          tx_hash: txHash
        });
      } catch (error) {
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.MakeCollectionOffer,
          event,
          tx_hash: txHash,
          is_failure: true,
          message: retrieveErrorMessage(error)
        });

        console.error(`Error when handle make_collection_offer: ${txHash}`);
        console.error(error);
      }
    }
  }

  // include collection_offer and single_nft_offer
  // tested
  private async onCancelOffer(wasmEvents: WasmEvents, txHash: string) {
    const cancelOfferEvents = findEventsByAction(
      wasmEvents,
      "cancel_collection_offer"
    );

    for (const event of cancelOfferEvents) {
      try {
        await this.consoleService.handleCancelOffer(
          event,
          txHash,
          DateTime.now()
        );
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.CancelCollectionOffer,
          event,
          tx_hash: txHash
        });
      } catch (error) {
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.CancelCollectionOffer,
          event,
          tx_hash: txHash,
          is_failure: true,
          message: retrieveErrorMessage(error)
        });

        console.error(`Error when handle cancel_collection_offer: ${txHash}`);
        console.error(error);
      }
    }
  }

  //tested
  private async onFixedSell(wasmEvents: WasmEvents, txHash: string) {
    const fixedSellEvents = findEventsByAction(wasmEvents, "fixed_sell");

    for (const event of fixedSellEvents) {
      try {
        await this.consoleService.handleFixedSell(
          event,
          txHash,
          DateTime.now()
        );
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.FixedSell,
          event,
          tx_hash: txHash
        });
      } catch (error) {
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.FixedSell,
          event,
          tx_hash: txHash,
          is_failure: true,
          message: retrieveErrorMessage(error)
        });

        console.error(`Error when handle fixed_sell: ${txHash}`);
        console.error(error);
      }
    }
  }

  //tested
  private async onBidding(wasmEvents: WasmEvents, txHash: string) {
    const biddingEvents = findEventsByAction(wasmEvents, "bidding");

    for (const event of biddingEvents) {
      try {
        await this.consoleService.handleBidding(event, txHash, DateTime.now());
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.Bidding,
          event,
          tx_hash: txHash
        });
      } catch (error) {
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.Bidding,
          event,
          tx_hash: txHash,
          message: retrieveErrorMessage(error),
          is_failure: true
        });

        console.error(`Error when handle bidding: ${txHash}`);
        console.error(error);
      }
    }
  }

  //tested
  private async onCancelBidding(wasmEvents: WasmEvents, txHash: string) {
    const cancelBiddingEvents = findEventsByAction(
      wasmEvents,
      "cancel_propose"
    );

    for (const event of cancelBiddingEvents) {
      try {
        await this.consoleService.handleCancelBidding(event, txHash);
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.CancelBidding,
          event,
          tx_hash: txHash
        });
      } catch (error) {
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.CancelBidding,
          event,
          tx_hash: txHash,
          is_failure: true,
          message: retrieveErrorMessage(error)
        });

        console.error(`Error when handle cancel_propose: ${txHash}`);
        console.error(error);
      }
    }
  }

  private async onEditSale(wasmEvents: WasmEvents, txHash: string) {
    const editSaleEvents = findEventsByAction(wasmEvents, "edit_sale");

    for (const event of editSaleEvents) {
      try {
        await this.consoleService.handleEditSale(event, txHash);
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.EditSale,
          event,
          tx_hash: txHash
        });
      } catch (error) {
        await this.tracingRepository.createStreamTx({
          action: MRKT_MARKETPLACE_ACTIONS.EditSale,
          event,
          tx_hash: txHash,
          is_failure: true,
          message: retrieveErrorMessage(error)
        });

        console.error(`Error when handle edit_sale: ${txHash}`);
        console.error(error);
      }
    }
  }
}
