import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import type { IndexedTx } from "@cosmjs/cosmwasm-stargate";
import { DateTime, Duration } from "luxon";
import { Command, CommandRunner } from "nest-commander";

import { CollectionRepository } from "@root/shared/repositories/collection.repository";
import { ConfigRepository } from "@root/shared/repositories/config.repository";
import { TracingRepository } from "@root/shared/repositories/tracing.repository";
import { sleep } from "@root/utils/sleep.util";

import {
  InjectCosmWasmClient,
  InjectSecrets,
  Secrets
} from "../secret/secret.module";
import { ConsoleService } from "./console.service";
import type { Cwr721Actions, MrktMarketplaceActions } from "./helper/shared";
import {
  CWR721ACTIONS,
  MRKT_MARKETPLACE_ACTIONS,
  findAttributeByKey,
  retrieveErrorMessage
} from "./helper/shared";
import type { WasmEvents } from "./helper/type";

@Command({
  name: "scan-block"
})
export class BlockScannerConsole extends CommandRunner {
  constructor(
    private consoleService: ConsoleService,
    private tracingRepository: TracingRepository,
    private configRepository: ConfigRepository,
    private collectionRepository: CollectionRepository,
    @InjectSecrets() private secrets: Secrets,
    @InjectCosmWasmClient() private cosmWasmClient: CosmWasmClient
  ) {
    super();
  }

  async run(): Promise<void> {
    const POLL_FREQUENCY = 100;

    let currentHeight = Number(
      await this.configRepository.get("current_height")
    );

    if (!currentHeight) {
      const latestBlock = await this.cosmWasmClient.getBlock();
      await this.configRepository.upset(
        "current_height",
        latestBlock.header.height.toString()
      );
      currentHeight = latestBlock.header.height;
    }

    while (true) {
      try {
        await this.poll(currentHeight);
        await sleep(Duration.fromMillis(POLL_FREQUENCY));
      } catch (error) {
        console.error(`Scan error at height: ${currentHeight}`);
        console.error(error);
      }
    }
  }

  private async poll(currentHeight: number) {
    const block = await this.cosmWasmClient.getBlock();

    // avoid scanner and stream are working on the same block at the same time
    while (currentHeight <= block.header.height - 10) {
      const txs = await this.cosmWasmClient.searchTx(
        `tx.height=${currentHeight}`
      );
      const allCollections = await this.collectionRepository
        .findAllCollectionAddress()
        .then(collections => collections.map(collection => collection.address));

      for (const tx of txs) {
        const supportedCollectionNftEvents =
          this.findMintAndTransferEventOnAllSupportedCollection(
            tx,
            allCollections
          );

        // const mrktWasmEvents: WasmEvents =
        //   this.findWasmEventsOnMrktContractTransaction(tx);

        if (supportedCollectionNftEvents.length) {
          await this.handleNftOwnerEntireAllCollections(
            supportedCollectionNftEvents,
            tx.hash
          );
        }

        // if (mrktWasmEvents.length) {
        //   await this.handleMissingTxFromStream(
        //     mrktWasmEvents,
        //     tx.hash,
        //     currentHeight
        //   );
        // }
      }

      currentHeight++;

      await this.configRepository.set(
        "current_height",
        currentHeight.toString()
      );
    }

    return currentHeight;
  }

  private async handleMissingTxFromStream(
    events: WasmEvents,
    txHash: string,
    height: number
  ) {
    const streamTx = await this.tracingRepository.findStreamTxByTxHash({
      txHash: txHash
    });

    if (streamTx) {
      console.log(`stream tx is already handled: ${streamTx.tx_hash}`);
      return;
    }

    for (const event of events) {
      const action = findAttributeByKey(event, "action") as
        | MrktMarketplaceActions
        | undefined;

      if (!action) {
        continue;
      }

      try {
        const date = await this.cosmWasmClient
          .getBlock(height)
          .then(block => block.header.time)
          .then(DateTime.fromISO);

        switch (action) {
          case MRKT_MARKETPLACE_ACTIONS.StartSale:
            await this.consoleService.handleStartSale(event, txHash, date);
            break;

          case MRKT_MARKETPLACE_ACTIONS.AcceptOffer:
            await this.consoleService.handlerAcceptOffer(event, txHash, date);
            break;

          case MRKT_MARKETPLACE_ACTIONS.CancelSale:
            await this.consoleService.handleCancelSale(event, txHash, date);
            break;

          case MRKT_MARKETPLACE_ACTIONS.MakeCollectionOffer:
            await this.consoleService.handleMakeOffer(event, txHash, date);
            break;

          case MRKT_MARKETPLACE_ACTIONS.CancelCollectionOffer:
            await this.consoleService.handleCancelOffer(event, txHash, date);
            break;

          case MRKT_MARKETPLACE_ACTIONS.FixedSell:
            await this.consoleService.handleFixedSell(event, txHash, date);
            break;

          case MRKT_MARKETPLACE_ACTIONS.Bidding:
            await this.consoleService.handleBidding(event, txHash, date);
            break;

          case MRKT_MARKETPLACE_ACTIONS.EditSale:
            await this.consoleService.handleEditSale(event, txHash);
            break;

          case MRKT_MARKETPLACE_ACTIONS.CancelBidding:
            await this.consoleService.handleCancelBidding(event, txHash);
            break;

          case MRKT_MARKETPLACE_ACTIONS.AcceptSale:
            await this.consoleService.handleAcceptSale(event, txHash, date);
            break;

          default:
            continue;
        }

        await this.tracingRepository.createStreamTx({
          action,
          event,
          tx_hash: txHash
        });
      } catch (error) {
        await this.tracingRepository.createStreamTx({
          action,
          event,
          tx_hash: txHash,
          is_failure: true,
          message: retrieveErrorMessage(error)
        });

        console.error(`Error handle missing stream tx ${action}: ${txHash}`);
        console.error(error);
      }
    }
  }

  private async handleNftOwnerEntireAllCollections(
    nftEvents: WasmEvents,
    txHash: string
  ) {
    for (const event of nftEvents) {
      const action = findAttributeByKey(event, "action") as Cwr721Actions;

      if (!action) {
        continue;
      }

      try {
        switch (action) {
          case CWR721ACTIONS.MintNft:
            await this.consoleService.handleCwr721MintNft(event);
            break;

          case CWR721ACTIONS.TransferNft:
            await this.consoleService.handleCwr721TransferNft(event);
            break;

          case CWR721ACTIONS.SendNft:
            await this.consoleService.handleCwr721SendNft(event);
            break;

          default:
            continue;
        }
      } catch (error) {
        await this.tracingRepository.createCwr721FailureTx({
          action,
          event,
          message: retrieveErrorMessage(error),
          tx_hash: txHash
        });

        console.error(`Error handle cwr721 tx ${action}: ${txHash}`);
        console.error(error);
      }
    }
  }

  private findWasmEventsOnMrktContractTransaction(tx: IndexedTx): WasmEvents {
    return tx.events.filter(
      event =>
        event.type === "wasm" &&
        !!event.attributes.find(
          ({ key, value }) =>
            key === "_contract_address" &&
            value === this.secrets.mrktContractAddress
        )
    );
  }

  private findMintAndTransferEventOnAllSupportedCollection(
    tx: IndexedTx,
    supportedCollections: Array<string>
  ) {
    return tx.events.filter(
      ({ type, attributes }) =>
        type === "wasm" &&
        !!attributes.find(
          ({ key, value }) =>
            key === "_contract_address" && supportedCollections.includes(value)
        ) &&
        !!attributes.find(
          ({ key, value }) =>
            key === "action" &&
            Object.values(CWR721ACTIONS as object).includes(value)
        )
    );
  }
}
