import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { GetCollectionsByOwnerParams } from "./parsers/get-collections-by-owner";
import { GetNftsByOwnerQuery } from "./parsers/get-nfts-by-owner";
import { UserService } from "./user.service";

@Controller("users")
@ApiTags("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(":wallet_address/nfts")
  getOwnedNfts(
    @Param("wallet_address") walletAddress: string,
    @Query() query: GetNftsByOwnerQuery
  ) {
    return this.userService.getOwnedNfts(walletAddress, query);
  }

  @Get(":wallet_address/listed-nfts")
  getListedNfts(@Param("wallet_address") walletAddress: string) {
    return this.userService.getListedNftsBySellerAddress(walletAddress);
  }

  @Get(":wallet_address/collections")
  getOwnedCollections(
    @Param("wallet_address") walletAddress: string,
    @Query() query: GetCollectionsByOwnerParams
  ) {
    return this.userService.getCollectionsByOwner(walletAddress, query);
  }
}
