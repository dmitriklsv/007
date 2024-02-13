import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class CollectionOutput {
  @Expose()
  @ApiProperty()
  address: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  slug: string;

  @Expose()
  @ApiProperty()
  symbol: string;

  @Expose()
  @ApiProperty()
  image: string;

  @Expose()
  @ApiProperty()
  banner: string;

  @Expose()
  @ApiProperty()
  description: string;
}

export class CollectionsResponse {
  @Expose()
  @ApiProperty()
  count: number;

  @Expose()
  @ApiProperty({ type: [CollectionOutput] })
  collections: CollectionOutput[];
}
