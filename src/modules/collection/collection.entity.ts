import { ApiProperty } from "@nestjs/swagger";
import type { Collection } from "@prisma/client";

export class CollectionEntity implements Collection {
  @ApiProperty({ required: true, nullable: false })
  address: string;

  @ApiProperty({ required: true, nullable: false })
  name: string;

  @ApiProperty({ required: true, nullable: false })
  slug: string;

  @ApiProperty({ required: true, nullable: false })
  symbol: string;

  @ApiProperty({ required: true, nullable: false })
  image: string;

  @ApiProperty({ required: false, nullable: true })
  banner: string | null;

  @ApiProperty({ required: false, nullable: true })
  description: string | null;
}
