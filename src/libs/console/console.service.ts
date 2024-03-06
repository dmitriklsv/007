import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { Injectable } from "@nestjs/common";
import type { CollectionOffer, SaleType } from "@prisma/client";
import { DateTime } from "luxon";

import { CollectionRepository } from "@root/shared/repositories/collection.repository";
import { NftRepository } from "@root/shared/repositories/nft.repository";
import { TransactionRepository } from "@root/shared/repositories/transaction.repository";
import { getNftMetadata } from "@root/shared/services/http/get-nft-metadata";
import { getContractInfo } from "@root/shared/services/query-contract/get-contract-info";
import { getNftInfo } from "@root/shared/services/query-contract/get-nft-info";

import { PrismaService } from "../prisma/prisma.service";
import { InjectCosmWasmClient } from "../secret/secret.module";
import { findAttributeByKey } from "./helper/shared";
import type { ContractEvent, CreateListing } from "./helper/type";

@Injectable()
export class ConsoleService {
  constructor(
    private prisma: PrismaService,
    private collectionRepository: CollectionRepository,
    private nftRepository: NftRepository,
    private transactionRepository: TransactionRepository,
    @InjectCosmWasmClient() private client: CosmWasmClient
  ) {}

  //tested
  public async handleStartSale(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const initialPrice = findAttributeByKey(event, "initial_price");
    const saleType = findAttributeByKey(event, "sale_type") as SaleType; // auction or fixed
    const seller = findAttributeByKey(event, "seller");
    const denom = findAttributeByKey(event, "denom");

    const duration = findAttributeByKey(event, "duration_type"); // available when sale_type = auction
    const minBidIncrementPercent = findAttributeByKey(
      event,
      "min_bid_increment_percent"
    ); // available when sale_type = auction

    let startDate: DateTime | undefined = undefined;
    let endDate: DateTime | undefined = undefined;

    if (saleType === "auction" && duration) {
      startDate = DateTime.fromSeconds(Number(JSON.parse(duration).start));

      endDate = DateTime.fromSeconds(Number(JSON.parse(duration).end));
    }

    if (
      !tokenAddress ||
      !tokenId ||
      !initialPrice ||
      !saleType ||
      !seller ||
      !denom
    ) {
      throw new Error(`missing event attribute in start_sale: ${txHash}`);
    }

    await this.createListingAndActivity({
      tokenAddress,
      tokenId,
      saleType,
      endDate,
      startDate,
      minBidIncrementPercent: minBidIncrementPercent
        ? Number(minBidIncrementPercent)
        : undefined,
      sellerAddress: seller,
      price: Number(initialPrice),
      denom,
      txHash,
      collectionAddress: tokenAddress,
      createdDate: date
    });

    console.log(
      `Done handle start_sale at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  // tested
  public async handlerAcceptOffer(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const buyer = findAttributeByKey(event, "buyer");
    const seller = findAttributeByKey(event, "seller");
    const price = findAttributeByKey(event, "price");

    if (!tokenAddress || !tokenId || !buyer || !seller || !price) {
      throw new Error(`missing event attribute in accept_offer: ${txHash}`);
    }

    let denom = "usei";

    const nftId = await this.createNftIfNotExist(tokenAddress, tokenId);

    const nft = await this.nftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (nft?.Listing) {
      await this.nftRepository.deleteListing(nft.Listing);
    }

    const nftOffer =
      await this.nftRepository.findHighestNftOfferExcludeSelfOffer(
        nftId,
        seller
      );

    const collectionOffer =
      await this.collectionRepository.findHighestCollectionOfferExcludeSelfOffer(
        tokenAddress,
        seller
      );

    if (nftOffer && collectionOffer) {
      if (collectionOffer.price > nftOffer.price) {
        await this.handleUpdateStatusCollectionOffer(collectionOffer);

        denom = collectionOffer.denom;
      } else {
        await this.nftRepository.deleteNftOffer(nftOffer.id);

        denom = nftOffer.denom;
      }
    } else if (nftOffer) {
      await this.nftRepository.deleteNftOffer(nftOffer.id);

      denom = nftOffer.denom;
    } else if (collectionOffer) {
      await this.handleUpdateStatusCollectionOffer(collectionOffer);

      denom = collectionOffer.denom;
    } else {
      throw new Error(
        `Not found collection_offer or nft_offer when handle accept_offer: ${txHash}`
      );
    }

    await this.prisma.$transaction([
      this.transactionRepository.create({
        collection_address: tokenAddress,
        buyerAddress: buyer,
        sellerAddress: seller,
        txHash,
        volume: Number(price),
        createdDate: date
      }),
      this.nftRepository.createNftActivity({
        denom,
        eventKind: "sale",
        buyerAddress: buyer,
        sellerAddress: seller,
        metadata: {},
        nftId,
        price: Number(price),
        txHash,
        createdDate: date
      })
    ]);

    console.log(
      `Done handle accept_offer at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  // tested
  public async handleAcceptSale(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const buyer = findAttributeByKey(event, "buyer");
    const seller = findAttributeByKey(event, "seller");
    const price = findAttributeByKey(event, "price");

    if (!tokenAddress || !tokenId || !buyer || !seller) {
      throw new Error(`missing event attribute in accept_sale: ${txHash}`);
    }

    const nftWithListing = await this.nftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nftWithListing || !nftWithListing.Listing) {
      throw new Error(`Not found listing when accept_sale: ${txHash}`);
    }

    await this.prisma.$transaction([
      this.transactionRepository.create({
        buyerAddress: buyer,
        sellerAddress: seller,
        collection_address: tokenAddress,
        txHash,
        volume: Number(price),
        createdDate: date
      }),
      this.nftRepository.createNftActivity({
        denom: nftWithListing.Listing.denom,
        eventKind: "sale",
        metadata: {},
        nftId: nftWithListing.id,
        price: Number(price),
        txHash,
        buyerAddress: buyer,
        sellerAddress: seller,
        createdDate: date
      }),
      this.nftRepository.deleteListing(nftWithListing.Listing) // include delete all biddings belong to listing
    ]);

    console.log(
      `Done handle accept_sale at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  // tested
  public async handleCancelSale(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const seller = findAttributeByKey(event, "seller");

    if (!tokenAddress || !tokenId || !seller) {
      throw new Error(`missing event attribute in cancel_sale: ${txHash}`);
    }

    const nftWithListing = await this.nftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nftWithListing || !nftWithListing.Listing) {
      throw new Error(`Not found listing when cancel_sale: ${txHash}`);
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
        sellerAddress: seller,
        createdDate: date
      })
    ]);

    console.log(
      `Done handle cancel_sale at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  // include collection_offer and single_nft_offer
  // tested
  public async handleMakeOffer(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const buyer = findAttributeByKey(event, "buyer");
    const quantity = findAttributeByKey(event, "quantity");
    const price = findAttributeByKey(event, "price");
    const duration = JSON.parse(findAttributeByKey(event, "duration") || "");
    const denom = findAttributeByKey(event, "denom");

    const tokenId = findAttributeByKey(event, "token_id"); //available when offer is single nft offer

    if (!tokenAddress || !buyer || !quantity || !duration || !price || !denom) {
      throw new Error(`missing event attribute in make_offer: ${txHash}`);
    }

    const startDate = DateTime.fromSeconds(Number(duration.start));
    const endDate = DateTime.fromSeconds(Number(duration.end));

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
          denom,
          createdDate: date
        }),
        this.nftRepository.createNftActivity({
          denom,
          eventKind: "make_offer",
          nftId,
          metadata: {},
          price: Number(price),
          txHash,
          buyerAddress: buyer,
          createdDate: date
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
        denom,
        createdDate: date
      });

      console.log(
        `Done handle make_collection_offer at ${DateTime.now().toUTC()}: ${txHash}`
      );
    }
  }

  // include collection_offer and single_nft_offer
  // tested
  public async handleCancelOffer(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const buyer = findAttributeByKey(event, "buyer");
    const price = findAttributeByKey(event, "price");

    const tokenId = findAttributeByKey(event, "token_id"); //available when cancel a single nft offer

    if (!tokenAddress || !buyer || !price) {
      throw new Error(`missing event attribute in cancel_offer: ${txHash}`);
    }

    if (tokenId) {
      const nftOffer =
        await this.nftRepository.findNftOfferByTokenAddressTokenIdBuyerAndPrice(
          tokenAddress,
          tokenId,
          buyer,
          Number(price)
        );

      if (!nftOffer) {
        throw new Error(`Not found nft_offer when cancel_nft_offer: ${txHash}`);
      }

      await this.prisma.$transaction([
        this.nftRepository.deleteNftOffer(nftOffer.id),
        this.nftRepository.createNftActivity({
          denom: nftOffer.denom,
          eventKind: "cancel_offer",
          metadata: {},
          nftId: nftOffer.nft_id,
          price: nftOffer.price.toNumber(),
          txHash,
          buyerAddress: buyer,
          createdDate: date
        })
      ]);

      console.log(
        `Done handle cancel_single_nft_offer at ${DateTime.now().toUTC()}: ${txHash}`
      );
    } else {
      await this.collectionRepository.deleteCollectionOfferByCollectionAddressBuyerAndPrice(
        tokenAddress,
        buyer,
        Number(price)
      );

      console.log(
        `Done handle cancel_collection_offer at ${DateTime.now().toUTC()}: ${txHash}`
      );
    }
  }

  //tested
  public async handleFixedSell(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const buyer = findAttributeByKey(event, "buyer");
    const seller = findAttributeByKey(event, "seller");
    const tokenId = findAttributeByKey(event, "token_id");
    const messages = findAttributeByKey(event, "messages");
    const price = findAttributeByKey(event, "price");

    if (!tokenAddress || !buyer || !seller || !tokenId || !price) {
      throw new Error(`missing event attribute in fixed_cell: ${txHash}`);
    }

    const nft = await this.nftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nft || !nft.Listing) {
      throw new Error(`Not found nft with listing when fixed_sell: ${txHash}`);
    }

    await this.prisma.$transaction([
      this.transactionRepository.create({
        buyerAddress: buyer,
        sellerAddress: seller,
        collection_address: tokenAddress,
        txHash,
        volume: Number(price),
        createdDate: date
      }),
      this.nftRepository.createNftActivity({
        denom: nft.Listing.denom,
        eventKind: "sale",
        metadata: {
          messages
        },
        nftId: nft.id,
        price: Number(price),
        txHash,
        sellerAddress: seller,
        buyerAddress: buyer,
        createdDate: date
      }),
      this.nftRepository.deleteListing(nft.Listing)
    ]);

    console.log(
      `Done handle fixed_sell at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  //tested
  public async handleBidding(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const buyer = findAttributeByKey(event, "buyer");
    const tokenId = findAttributeByKey(event, "token_id");
    const price = findAttributeByKey(event, "price");

    if (!tokenAddress || !buyer || !tokenId || !price) {
      throw new Error(`missing event attribute in bidding: ${txHash}`);
    }

    const nftWithListing = await this.nftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nftWithListing || !nftWithListing.Listing) {
      throw new Error(`Not found nft with listing when bidding: ${txHash}`);
    }

    await this.prisma.$transaction([
      this.transactionRepository.create({
        buyerAddress: buyer,
        sellerAddress: nftWithListing.Listing.seller_address,
        collection_address: tokenAddress,
        txHash,
        volume: Number(price),
        createdDate: date
      }),
      this.nftRepository.createNftBidding({
        buyerAddress: buyer,
        listing: nftWithListing.Listing,
        price: Number(price),
        txHash,
        createdDate: date
      })
    ]);

    console.log(`Done handle bidding at ${DateTime.now().toUTC()}: ${txHash}`);
  }

  //tested
  public async handleCancelBidding(event: ContractEvent, txHash: string) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const buyer = findAttributeByKey(event, "buyer");

    if (!tokenAddress || !buyer || !tokenId) {
      throw new Error(`missing event attribute in cancel_propose: ${txHash}`);
    }

    const nftWithListing = await this.nftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nftWithListing || !nftWithListing.Listing) {
      throw new Error(
        `Not found nft with listing when cancel_propose: ${txHash}`
      );
    }
    //??
    await this.nftRepository.deleteNftBidding(buyer, nftWithListing.Listing);

    console.log(
      `Done handle cancel_propose at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  public async handleEditSale(event: ContractEvent, txHash: string) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const tokenId = findAttributeByKey(event, "token_id");

    const price = findAttributeByKey(event, "initial_price");
    const minBidIncrementPercent = findAttributeByKey(
      event,
      "min_bid_increment_percent"
    );

    if (!tokenAddress || !tokenId) {
      throw new Error(`missing event attribute in edit_sale: ${txHash}`);
    }

    const nftWithListing = await this.nftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nftWithListing || !nftWithListing.Listing) {
      throw new Error(`Not found nft with listing when edit_sale: ${txHash}`);
    }

    await this.nftRepository.updateListing({
      listing: nftWithListing.Listing,
      minBidIncrementPercent: minBidIncrementPercent
        ? Number(minBidIncrementPercent)
        : undefined,
      price: price ? Number(price) : undefined
    });

    console.log(
      `Done handle edit_sale at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  public async handleCwr721MintNft(event: ContractEvent) {
    const tokenAddress = findAttributeByKey(event, "_contract_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const owner = findAttributeByKey(event, "owner");

    if (!tokenAddress || !tokenId || !owner) {
      throw new Error("Missing event attribute when handle cwr721 mint");
    }

    await this.createNftIfNotExist(tokenAddress, tokenId);
    await this.nftRepository.updateOwner({
      tokenAddress,
      tokenId,
      ownerAddress: owner
    });

    console.log(`Done handle cwr721 mint at ${DateTime.now().toUTC()}`);
  }

  public async handleCwr721TransferNft(event: ContractEvent) {
    const tokenAddress = findAttributeByKey(event, "_contract_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const recipient = findAttributeByKey(event, "recipient");

    if (!tokenAddress || !tokenId || !recipient) {
      throw new Error("Missing event attribute when handle cwr721 transfer");
    }

    await this.createNftIfNotExist(tokenAddress, tokenId);
    await this.nftRepository.updateOwner({
      tokenAddress,
      tokenId,
      ownerAddress: recipient
    });

    console.log(`Done handle cwr721 transfer at ${DateTime.now().toUTC()}`);
  }

  public async handleCwr721SendNft(event: ContractEvent) {
    const tokenAddress = findAttributeByKey(event, "_contract_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const recipient = findAttributeByKey(event, "recipient");

    if (!tokenAddress || !tokenId || !recipient) {
      throw new Error("Missing event attribute when handle cwr721 send_nft");
    }

    await this.nftRepository.updateOwner({
      tokenAddress,
      tokenId,
      ownerAddress: recipient
    });

    console.log(`Done handle cwr721 send_nft at ${DateTime.now().toUTC()}`);
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
    collectionAddress,
    createdDate
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
        collectionAddress,
        createdDate
      }),
      this.nftRepository.createNftActivity({
        eventKind: "list",
        denom,
        sellerAddress,
        metadata: {},
        nftId,
        price,
        txHash,
        createdDate
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
    collectionOffer: CollectionOffer
  ) {
    await this.collectionRepository.updateCollectionOfferProcess(
      collectionOffer
    );

    const currentQuantity = collectionOffer.current_quantity + 1;

    if (currentQuantity === collectionOffer.quantity) {
      await this.collectionRepository.deleteCollectionOfferByCollectionAddressBuyerAndPrice(
        collectionOffer.collection_address,
        collectionOffer.buyer_address,
        collectionOffer.price.toNumber()
      );
    }
  }
}
