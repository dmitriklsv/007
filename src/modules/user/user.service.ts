import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { readConfigOrThrow } from "@root/shared/helper/read-config";
import { getOwnedNftsByAddress } from "@root/shared/services/http/get-owned-nfts-by-address";

@Injectable()
export class UserService {
  constructor(private configService: ConfigService) {}

  public async getOwnedNft(ownedAddress: string, collectionAddress?: string) {
    const palletApiUrl = readConfigOrThrow("PALLET_API_URL")(
      this.configService
    );

    let nfts = await getOwnedNftsByAddress(palletApiUrl, ownedAddress).then(
      response => response.nfts
    );

    if (collectionAddress) {
      nfts = nfts.filter(
        nft => nft.collection.contract_address === collectionAddress
      );
    }

    return {
      address: ownedAddress,
      nfts
    };
  }
}
