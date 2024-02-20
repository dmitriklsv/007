import { Injectable } from "@nestjs/common";

import { PrismaService } from "@root/libs/prisma/prisma.service";

type CreateNftParams = {
  name: string;
  address: string;
  image: string;
  ownerAddress: string;
  tokenId: string;
  description?: string;
  traits: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
};

@Injectable()
export class NftRepository {
  constructor(private prisma: PrismaService) {}

  public findByAddressAndTokenId(address: string, tokenId: string) {
    return this.prisma.nft.findUnique({
      where: {
        contract_address_token_id: {
          contract_address: address,
          token_id: tokenId
        }
      }
    });
  }

  public async createNft({
    address,
    image,
    name,
    traits,
    description,
    ownerAddress,
    tokenId
  }: CreateNftParams) {
    await this.prisma.user.upsert({
      create: {
        address: ownerAddress
      },
      update: {},
      where: {
        address: ownerAddress
      }
    });

    return this.prisma.nft.create({
      data: {
        name,
        token_id: tokenId,
        image,
        traits: {
          createMany: {
            data: traits?.map(({ trait_type, value, display_type }) => ({
              attribute: trait_type,
              value: value.toString(),
              display_type
            }))
          }
        },
        description,
        contract_address: address,
        owner_address: ownerAddress
      }
    });
  }
}
