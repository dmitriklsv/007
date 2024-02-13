import { Controller, HttpStatus, Get, Query, Param } from "@nestjs/common";
import { ApiResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { PaginationParamsDto } from "@root/shared/dtos/pagination-params.dto";

import { CollectionsResponse } from "./collection-output.dto";
import { CollectionOutput } from "./collection-output.dto";
import { CollectionService } from "./collection.service";

@ApiTags("collections")
@Controller("collections")
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get()
  @ApiOperation({ summary: "Get all collections" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Return all collections.",
    type: CollectionsResponse
  })
  async getCollections(
    @Query() query: PaginationParamsDto
  ): Promise<CollectionsResponse> {
    const collections = await this.collectionService.getCollections(
      query.page,
      query.page_size,
      query.q
    );

    return collections;
  }

  @Get(":address")
  @ApiOperation({ summary: "Get collection" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Return collection matching the address.",
    type: CollectionOutput
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Return a 'not found' error.",
    type: CollectionOutput
  })
  async getCollection(
    @Param("address") address: string
  ): Promise<CollectionOutput> {
    const collection = await this.collectionService.getCollection(address);

    return collection;
  }
}
