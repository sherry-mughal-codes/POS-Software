export interface PaginatedResponse<T> {
  count: number;
  total_pages?: number;
  page?: number;
  page_size?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

export interface PaginationQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  all?: boolean;
  [key: string]: any;
}
