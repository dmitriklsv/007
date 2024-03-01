export type PaginatedResponse<T> = Readonly<{
  data: Array<T>;
  page: number;
  take: number;
  total: number;
}>;
