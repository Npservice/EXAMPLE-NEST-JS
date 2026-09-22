export interface PagingMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface Paging<T> {
  items: T[];
  meta: PagingMeta;
}

export function toPaging<T>(
  items: T[],
  size: number,
  page: number,
  total: number,
): Paging<T> {
  return {
    items,
    meta: {
      current_page: page,
      per_page: size,
      total,
      last_page: Math.max(1, Math.ceil(total / size)),
    },
  };
}
