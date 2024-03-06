import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "@root/libs/prisma/prisma.service";

type FindStreamTxByTxHashParams = {
  txHash: string;
  isFailure?: boolean;
};

@Injectable()
export class TracingRepository {
  constructor(private prisma: PrismaService) {}

  public async createStreamTx(data: Prisma.StreamTxCreateInput) {
    try {
      await this.prisma.streamTx.create({
        data
      });
    } catch (error) {
      console.error("fail to create stream tx");
      console.error(error);
    }
  }

  public async createCwr721FailureTx(data: Prisma.Cwr721FailureTxCreateInput) {
    try {
      await this.prisma.cwr721FailureTx.create({
        data
      });
    } catch (error) {
      console.error("fail to create cwr721 tx");
      console.error(error);
    }
  }

  public findStreamTxByTxHash({
    isFailure,
    txHash
  }: FindStreamTxByTxHashParams) {
    return this.prisma.streamTx.findFirst({
      where: {
        tx_hash: txHash,
        is_failure: isFailure
      }
    });
  }
}
