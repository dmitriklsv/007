import type { CollectionOutput } from "./collection-output.dto";

export interface CollectionRO {
  collection: CollectionOutput;
}

export interface CollectionsRO {
  count: number;
  collections: CollectionOutput[];
}
