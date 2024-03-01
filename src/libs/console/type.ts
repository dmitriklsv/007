import type { SaleType } from "@prisma/client";

export type CreateListing = {
  txHash: string;
  tokenAddress: string;
  tokenId: string;
  price: number;
  denom: string;
  saleType: SaleType;
  sellerAddress: string;
  collectionAddress: string;
  minBidIncrementPercent?: number;
  startDate?: Date;
  endDate?: Date;
};
