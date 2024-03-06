import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class CreateCollectionPayload {
  @ApiProperty()
  @IsNotEmpty()
  collectionAddress: string;
}
