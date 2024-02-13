import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsString, IsOptional, Min } from "class-validator";

export class PaginationParamsDto {
  @ApiPropertyOptional({
    description: "Optional, defaults to 1",
    type: Number
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: "Optional, defaults to 25",
    type: Number
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page_size = 25;

  @ApiPropertyOptional({
    description: "Optional, defaults is empty",
    type: String
  })
  @IsString()
  @IsOptional()
  q = "";
}
