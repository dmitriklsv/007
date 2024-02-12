import { Controller, Get, Param } from "@nestjs/common";

import { genericApi } from "@root/shared/helpers/generic-api.helper";

import { CollectionService } from "./collection.service";

@Controller("collections")
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get(":address")
  getCollection(@Param("address") address: string) {
    return genericApi(this.collectionService.getCollection(address));
  }
}
