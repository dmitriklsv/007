import type { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import type { OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SaleType } from "@prisma/client";
import { DateTime } from "luxon";
import { Command, CommandRunner } from "nest-commander";
import { v4 } from "uuid";
import WebSocket from "ws";

import { readConfigOrThrow } from "@root/shared/helper/read-config";
import { BlockRepository } from "@root/shared/repositories/block.repository";
import { CollectionRepository } from "@root/shared/repositories/collection.repository";
import { NftRepository } from "@root/shared/repositories/nft.repository";
import { TransactionRepository } from "@root/shared/repositories/transaction.repository";
import { getNftMetadata } from "@root/shared/services/http/get-nft-metadata";
import { getContractInfo } from "@root/shared/services/query-contract/get-contract-info";
import { getNftInfo } from "@root/shared/services/query-contract/get-nft-info";
import { debugLogs } from "@root/utils/debug.util";

import { PrismaService } from "../prisma/prisma.service";
import type { CreateListing } from "./type";

type Event = Record<string, Array<string>>;

const createSubscribeMessage = (contractAddress: string) =>
  JSON.stringify({
    jsonrpc: "2.0",
    method: "subscribe",
    id: v4().toString(),
    params: {
      query: `tm.event = 'Tx' AND wasm._contract_address='${contractAddress}'`
    }
  });

const ACTIONS = {
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

@Command({
  name: "listen-stream"
})
export class StreamConsole extends CommandRunner implements OnModuleInit {
  private wssUrl: string;
  private client: CosmWasmClient;
  private mrktContractAddress: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private collectionRepository: CollectionRepository,
    private nftRepository: NftRepository,
    private blockRepository: BlockRepository,
    private transactionRepository: TransactionRepository
  ) {
    super();
  }

  run(): Promise<void> {
    this.listenStream();
    return Promise.resolve(void 0);
  }

  async onModuleInit() {
    const rpcURL = readConfigOrThrow("RPC_URL")(this.configService);
    this.client = await SigningCosmWasmClient.connect(rpcURL);
    this.wssUrl = readConfigOrThrow("RPC_WSS_URL")(this.configService);
    this.mrktContractAddress = readConfigOrThrow("MRKT_CONTRACT_ADDRESS")(
      this.configService
    );
  }

  private listenStream() {
    const websocket = new WebSocket(this.wssUrl);

    websocket.on("open", () => {
      websocket.send(createSubscribeMessage(this.mrktContractAddress));
      console.log(
        `Listening contract logs stream: ${this.mrktContractAddress}`
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
      //eslint-disable-next-line
      const event: Event = JSON.parse(raw as any).result.events || {};
      const action = event["wasm.action"] || [];
      const txHash = event["tx.hash"]?.[0];

      debugLogs("event: ", event);
      await this.createTracingBlock(event);

      try {
        if (action.includes(ACTIONS.StartSale)) {
          await this.onStartSale(event);
          return;
        }

        if (action.includes(ACTIONS.AcceptOffer)) {
          await this.onAcceptOffer(event);
          return;
        }

        if (action.includes(ACTIONS.CancelSale)) {
          await this.onCancelSale(event);
          return;
        }

        if (action.includes(ACTIONS.MakeCollectionOffer)) {
          await this.onMakeOffer(event);
          return;
        }

        if (action.includes(ACTIONS.CancelCollectionOffer)) {
          await this.onCancelOffer(event);
          return;
        }

        if (action.includes(ACTIONS.FixedSell)) {
          await this.onFixedSell(event);
          return;
        }

        if (action.includes(ACTIONS.Bidding)) {
          await this.onBidding(event);
          return;
        }

        if (action.includes(ACTIONS.EditSale)) {
          await this.onEditSale(event);
          return;
        }

        if (action.includes(ACTIONS.CancelBidding)) {
          await this.onCancelBidding(event);
          return;
        }

        if (action.includes(ACTIONS.AcceptSale)) {
          await this.onAcceptSale(event);
          return;
        }
      } catch (error) {
        console.error(`Fail to handle action ${action}: ${txHash}`);
        console.error(error);
      }
    });
  }

  private async onStartSale(event: Event) {
    const tokenAddress = event["wasm.cw721_address"][0];
    const tokenId = event["wasm.token_id"][0];
    const initialPrice = event["wasm.initial_price"][0];
    const denom = event["wasm.denom"][0];
    const sender = event["wasm.sender"][0];
    const txHash = event["tx.hash"][0];

    const saleType = event["wasm.sale_type"][0] as SaleType; // auction or fixed
    const duration = event["wasm.duration_type"]?.[0]; // available when sale_type = auction
    const minBidIncrementPercent = event["wasm.min_bid_increment_percent"]?.[0]; // available when sale_type = auction

    const startDate =
      saleType === "auction"
        ? DateTime.fromSeconds(Number(JSON.parse(duration).start)).toJSDate()
        : undefined;

    const endDate =
      saleType === "auction"
        ? DateTime.fromSeconds(Number(JSON.parse(duration).end)).toJSDate()
        : undefined;

    await this.createListingAndActivity({
      tokenAddress,
      tokenId,
      saleType,
      endDate,
      startDate,
      minBidIncrementPercent: minBidIncrementPercent
        ? Number(minBidIncrementPercent)
        : undefined,
      sellerAddress: sender,
      price: Number(initialPrice),
      denom,
      txHash,
      collectionAddress: tokenAddress
    });

    console.log(
      `Done handle start_sale at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  private async onAcceptOffer(event: Event) {
    const txHash = event["tx.hash"][0];
    const tokenAddress = event["wasm.cw721_address"][0];
    const tokenId = event["wasm.token_id"][0];
    const buyer = event["wasm.buyer"][0];
    const seller = event["wasm.seller"][0];
    const price = event["wasm.price"][0];

    let denom = "usei";

    const nftId = await this.createNftIfNotExist(tokenAddress, tokenId);

    const nftOffer =
      await this.nftRepository.findNftOfferByBuyerAddressAndNftId(buyer, nftId);

    if (nftOffer) {
      await this.nftRepository.completeNftOfferByTxHash(nftOffer.tx_hash);
      denom = nftOffer.denom;
    } else {
      const collectionOffer =
        await this.collectionRepository.findCollectionOfferByBuyerAddressAndCollectionAddress(
          buyer,
          tokenAddress
        );

      if (!collectionOffer) {
        console.error(
          `Not found collection_offer when handle accept_offer: ${txHash}`
        );
        return;
      }

      denom = collectionOffer.denom;
    }

    await this.prisma.$transaction([
      this.transactionRepository.create({
        collection_address: tokenAddress,
        buyerAddress: buyer,
        sellerAddress: seller,
        txHash,
        volume: Number(price)
      }),
      this.nftRepository.createNftActivity({
        denom,
        eventKind: "sale",
        buyerAddress: buyer,
        sellerAddress: seller,
        metadata: {},
        nftId,
        price: Number(price),
        txHash
      })
    ]);

    await this.handleUpdateStatusCollectionOffer(buyer, tokenAddress);

    console.log(
      `Done handle accept_offer at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  private async onAcceptSale(event: Event) {
    const txHash = event["tx.hash"][0];
    const tokenAddress = event["wasm.cw721_address"][0];
    const tokenId = event["wasm.token_id"][0];
    const buyer = event["wasm.buyer"][0];
    const seller = event["wasm.seller"][0];
    const price = event["wasm.price"][0];

    const nftWithListing = await this.nftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nftWithListing || !nftWithListing.Listing) {
      console.error(
        `Not found listing when accept_sale token_address: ${tokenAddress} >> token_id: ${tokenId} >> ${txHash}`
      );
      return;
    }

    await this.prisma.$transaction([
      this.transactionRepository.create({
        buyerAddress: buyer,
        sellerAddress: seller,
        collection_address: tokenAddress,
        txHash,
        volume: Number(price)
      }),
      this.nftRepository.createNftActivity({
        denom: nftWithListing.Listing.denom,
        eventKind: "sale",
        metadata: {},
        nftId: nftWithListing.id,
        price: Number(price),
        txHash,
        buyerAddress: buyer,
        sellerAddress: seller
      }),
      this.nftRepository.deleteListing(nftWithListing.Listing)
    ]);
  }

  private async onCancelSale(event: Event) {
    const tokenAddress = event["wasm.cw721_address"][0];
    const tokenId = event["wasm.token_id"][0];
    const seller = event["wasm.seller"][0];
    const txHash = event["tx.hash"][0];

    const nftWithListing = await this.nftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nftWithListing || !nftWithListing.Listing) {
      console.error(
        `Not found listing when cancel_sale token_address: ${tokenAddress} >> token_id: ${tokenId} >> ${txHash}`
      );
      return;
    }

    await this.prisma.$transaction([
      this.nftRepository.deleteListing(nftWithListing.Listing),
      this.nftRepository.createNftActivity({
        denom: nftWithListing.Listing.denom,
        eventKind: "delist",
        metadata: {},
        txHash,
        price: nftWithListing.Listing.price.toNumber(),
        nftId: nftWithListing.id,
        sellerAddress: seller
      })
    ]);

    console.log(
      `Done handle cancel_sale at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  // include collection_offer and single_nft_offer
  private async onMakeOffer(event: Event) {
    const tokenAddress = event["wasm.cw721_address"][0];
    const buyer = event["wasm.buyer"][0];
    const quantity = event["wasm.quantity"][0];
    const duration = JSON.parse(event["wasm.duration"][0]);
    const txHash = event["tx.hash"][0];
    const price = event["wasm.price"][0];
    const tokenId = event["wasm.token_id"]?.[0]; //available when offer is single nft offer

    const startDate = DateTime.fromSeconds(Number(duration.start)).toJSDate();
    const endDate = DateTime.fromSeconds(Number(duration.end)).toJSDate();

    await this.createCollectionIfNotExist(tokenAddress);

    if (tokenId) {
      // make single nft offer
      const nftId = await this.createNftIfNotExist(tokenAddress, tokenId);

      await this.prisma.$transaction([
        this.nftRepository.createNftOffer({
          buyerAddress: buyer,
          endDate,
          nftId,
          price: Number(price),
          startDate,
          txHash,
          denom: "usei" /// ?? need emit denom here
        }),
        this.nftRepository.createNftActivity({
          denom: "usei", /// ?? need emit denom here
          eventKind: "make_offer",
          nftId,
          metadata: {},
          price: Number(price),
          txHash,
          buyerAddress: buyer
        })
      ]);

      console.log(
        `Done handle make_single_nft_offer at ${DateTime.now().toUTC()}: ${txHash}`
      );
    } else {
      // make collection offer
      await this.collectionRepository.createCollectionOffer({
        address: tokenAddress,
        buyerAddress: buyer,
        endDate,
        startDate,
        price: Number(price),
        quantity: Number(quantity),
        txHash,
        denom: "usei" /// ?? need emit denom here
      });

      console.log(
        `Done handle make_collection_offer at ${DateTime.now().toUTC()}: ${txHash}`
      );
    }
  }

  // include collection_offer and single_nft_offer
  private async onCancelOffer(event: Event) {
    const txHash = event["tx.hash"][0];
    const tokenAddress = event["wasm.cw721_address"][0];
    const buyer = event["wasm.buyer"][0];
    const tokenId = event["wasm.token_id"]?.[0]; //available when cancel a single nft offer

    if (tokenId) {
      const nft = await this.nftRepository.findByAddressAndTokenId({
        tokenAddress,
        tokenId
      });

      if (!nft) {
        console.error(
          `Not found nft in database when cancel_nft_offer token_address=${tokenAddress} >> token_id=${tokenId} >> ${txHash}`
        );
        return;
      }

      const nftOffer =
        await this.nftRepository.findNftOfferByBuyerAddressAndNftId(
          buyer,
          nft.id
        );

      if (!nftOffer) {
        console.error(
          `Not found nft_offer in database when cancel_nft_offer buyer_address=${buyer} >> nft_id=${nft.id} >> ${txHash}`
        );
        return;
      }

      await this.prisma.$transaction([
        this.nftRepository.deleteNftOffer(nft.id, buyer),
        this.nftRepository.createNftActivity({
          denom: nftOffer.denom,
          eventKind: "cancel_offer",
          metadata: {},
          nftId: nft.id,
          price: nftOffer.price.toNumber(),
          txHash,
          buyerAddress: buyer
        })
      ]);

      console.log(
        `Done handle cancel_single_nft_offer at ${DateTime.now().toUTC()}: ${txHash}`
      );
    } else {
      await this.collectionRepository.deleteCollectionOffer(
        tokenAddress,
        buyer
      );

      console.log(
        `Done handle cancel_collection_offer at ${DateTime.now().toUTC()}: ${txHash}`
      );
    }
  }

  private async onFixedSell(event: Event) {
    const txHash = event["tx.hash"][0];
    const tokenAddress = event["wasm.cw721_address"][0];
    const buyer = event["wasm.buyer"][0];
    const seller = event["wasm.seller"][0];
    const tokenId = event["wasm.token_id"][0];
    const message = event["wasm.message"][0];
    const price = event["wasm.price"][0];

    const nft = await this.nftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nft || !nft.Listing) {
      console.error(
        `Not found nft in database when fixed_sell token_address=${tokenAddress} >> token_id=${tokenId} >> ${txHash}`
      );
      return;
    }

    await this.prisma.$transaction([
      this.transactionRepository.create({
        buyerAddress: buyer,
        sellerAddress: seller,
        collection_address: tokenAddress,
        txHash,
        volume: Number(price)
      }),
      this.nftRepository.createNftActivity({
        denom: nft.Listing.denom,
        eventKind: "sale",
        metadata: {
          message
        },
        nftId: nft.id,
        price: Number(price),
        txHash,
        sellerAddress: seller,
        buyerAddress: buyer
      }),
      this.nftRepository.deleteListing(nft.Listing)
    ]);

    console.log(
      `Done handle fixed_sell at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  private async onBidding(event: Event) {
    const txHash = event["tx.hash"][0];
    const tokenAddress = event["wasm.cw721_address"][0];
    const buyer = event["wasm.buyer"][0];
    const tokenId = event["wasm.token_id"][0];
    const price = event["wasm.price"][0];

    const nftWithListing = await this.nftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nftWithListing || !nftWithListing.Listing) {
      console.error(
        `Not found listing when bidding token_address: ${tokenAddress} >> token_id: ${tokenId} >> ${txHash}`
      );
      return;
    }

    await this.prisma.$transaction([
      this.transactionRepository.create({
        buyerAddress: buyer,
        sellerAddress: nftWithListing.Listing.seller_address,
        collection_address: tokenAddress,
        txHash,
        volume: Number(price)
      }),
      this.nftRepository.createNftBidding({
        buyerAddress: buyer,
        listing: nftWithListing.Listing,
        price: Number(price),
        txHash
      })
    ]);

    console.log(`Done handle bidding at ${DateTime.now().toUTC()}: ${txHash}`);
  }

  private async onCancelBidding(event: Event) {
    const txHash = event["tx.hash"][0];
    const tokenAddress = event["wasm.cw721_address"][0];
    const tokenId = event["wasm.token_id"][0];
    const buyer = event["wasm.buyer"][0];

    const nftWithListing = await this.nftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nftWithListing || !nftWithListing.Listing) {
      console.error(
        `Not found listing when cancel_propose token_address: ${tokenAddress} >> token_id: ${tokenId} >> ${txHash}`
      );
      return;
    }

    await this.nftRepository.deleteNftBidding(buyer, nftWithListing.Listing);

    console.log(
      `Done handle cancel_propose at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  private async onEditSale(event: Event) {
    const txHash = event["tx.hash"][0];
    const tokenAddress = event["wasm.cw721_address"][0];
    const tokenId = event["wasm.token_id"][0];
    const price = event["wasm.initial_price"][0];
    const minBidIncrementPercent = event["wasm.min_bid_increment_percent"][0];

    const nftWithListing = await this.nftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nftWithListing || !nftWithListing.Listing) {
      console.error(
        `Not found listing when edit_sale token_address: ${tokenAddress} >> token_id: ${tokenId} >> ${txHash}`
      );
      return;
    }

    await this.nftRepository.updateListing({
      listing: nftWithListing.Listing,
      minBidIncrementPercent: Number(minBidIncrementPercent),
      price: Number(price)
    });

    console.log(
      `Done handle edit_sale at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  private async createListingAndActivity({
    tokenAddress,
    tokenId,
    sellerAddress,
    saleType,
    minBidIncrementPercent,
    endDate,
    startDate,
    price,
    denom,
    txHash,
    collectionAddress
  }: CreateListing) {
    const nftId = await this.createNftIfNotExist(tokenAddress, tokenId);

    await this.prisma.$transaction([
      this.nftRepository.createNftListing({
        denom,
        nft_id: nftId,
        price,
        saleType,
        sellerAddress,
        txHash,
        endDate,
        minBidIncrementPercent,
        startDate,
        collectionAddress
      }),
      this.nftRepository.createNftActivity({
        eventKind: "list",
        denom,
        sellerAddress,
        metadata: {},
        nftId,
        price,
        txHash
      })
    ]);
  }

  private async createCollectionIfNotExist(tokenAddress: string) {
    const existedCollection =
      await this.collectionRepository.findByAddress(tokenAddress);

    if (!existedCollection) {
      const { name, symbol } = await getContractInfo(this.client, tokenAddress);
      await this.collectionRepository.create({
        address: tokenAddress,
        name,
        symbol
      });
    }
  }

  private async createNftIfNotExist(tokenAddress: string, tokenId: string) {
    let nft_id: number;

    const existedNft = await this.nftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!existedNft) {
      await this.createCollectionIfNotExist(tokenAddress);

      const { token_uri } = await getNftInfo(
        this.client,
        tokenAddress,
        tokenId
      );

      const nftMetadata = await getNftMetadata(token_uri);

      const newNft = await this.nftRepository.createNft({
        tokenId,
        image: nftMetadata.image,
        name: nftMetadata.name,
        traits: nftMetadata.attributes,
        description: nftMetadata.description,
        collection: {
          address: tokenAddress
        },
        tokenUri: token_uri
      });

      nft_id = newNft.id;
    } else {
      nft_id = existedNft.id;
    }

    return nft_id;
  }

  private async handleUpdateStatusCollectionOffer(
    buyerAddress: string,
    collectionAddress: string
  ) {
    const collectionOffer =
      await this.collectionRepository.findCollectionOfferByBuyerAddressAndCollectionAddress(
        buyerAddress,
        collectionAddress
      );

    //skip if there is not collection_offer
    if (!collectionOffer) {
      return;
    }

    await this.collectionRepository.updateCollectionOfferProcess(
      buyerAddress,
      collectionAddress
    );

    const currentQuantity = collectionOffer.current_quantity + 1;

    if (currentQuantity === collectionOffer.quantity) {
      await this.collectionRepository.completeCollectionOffer(
        buyerAddress,
        collectionAddress
      );
    }
  }

  private async createTracingBlock(event: Event) {
    try {
      const sender = event["message.sender"]?.[0] || "unknown";
      const txHash = event["tx.hash"]?.[0];
      const height = event["tx.height"]?.[0];
      const action = event["wasm.action"] || "unknown";

      if (txHash && height) {
        await this.blockRepository.create({
          date: DateTime.now().toJSDate(),
          height,
          txn_hash: txHash,
          sender,
          action: JSON.stringify(action)
        });
      }
    } catch (error) {
      console.error(
        `Fail to create block from event ${event["wasm.action"]}: ${event["tx.hash"]?.[0]}`
      );
      console.error(error);
    }
  }
}
