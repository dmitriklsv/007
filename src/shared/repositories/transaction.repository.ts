import { Injectable } from "@nestjs/common";
import { DateTime } from "luxon";

import { PrismaService } from "@root/libs/prisma/prisma.service";

type CreateTransactionParams = {
  txHash: string;
  volume: number;
  collection_address: string;
  buyerAddress: string;
  sellerAddress: string;
};

@Injectable()
export class TransactionRepository {
  constructor(private prisma: PrismaService) {}

  public create({
    txHash,
    volume,
    collection_address,
    buyerAddress,
    sellerAddress
  }: CreateTransactionParams) {
    return this.prisma.transaction.create({
      data: {
        date: DateTime.now().toJSDate(),
        txn_hash: txHash,
        volume,
        buyer_address: buyerAddress,
        seller_address: sellerAddress,
        Collection: {
          connect: {
            address: collection_address
          }
        }
      }
    });
  }
}
