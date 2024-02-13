import { Injectable } from "@nestjs/common";
import { plainToClass } from "class-transformer";

import { CollectionRepository } from "@root/shared/repositories/collection.repository";

import { CollectionOutput } from "./collection-output.dto";
// import type { CollectionsRO, CollectionRO } from "./collection.interface";
import type { CollectionsResponse } from "./collection-output.dto";

@Injectable()
export class CollectionService {
  constructor(private collectionRepository: CollectionRepository) {}

  async getCollections(
    page: number = 1,
    pageSize: number = 20,
    searchString: string = ""
  ): Promise<CollectionsResponse> {
    const count = await this.collectionRepository.getCount(searchString);
    const collections = await this.collectionRepository.findAll(
      page,
      pageSize,
      searchString
    );

    const collectionsOutput = plainToClass(CollectionOutput, collections, {
      excludeExtraneousValues: true
    });

    return { count, collections: collectionsOutput };
  }

  async getCollection(address: string): Promise<CollectionOutput> {
    const collection = await this.collectionRepository.findOne(address);

    const collectionOutput = plainToClass(CollectionOutput, collection, {
      excludeExtraneousValues: true
    });

    return collectionOutput;
  }
}
