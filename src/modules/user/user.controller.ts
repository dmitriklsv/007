import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { GetOwnedNfts } from "./parsers/get-owned-nfts";
import { UserService } from "./user.service";

@Controller("users")
@ApiTags("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(":wallet_address/nfts")
  getOwnedNft(
    @Param("wallet_address") walletAddress: string,
    @Query() query: GetOwnedNfts
  ) {
    return this.userService.getOwnedNft(walletAddress, query.collectionAddress);
  }
}
