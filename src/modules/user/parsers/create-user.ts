import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class CreateUserPayload {
  @ApiProperty()
  @IsNotEmpty()
  walletAddress: string;
}
