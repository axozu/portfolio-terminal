import { DEFAULT_PAGE_SIZE, transactionsQuerySchema, type TransactionsQuery } from '@/shared/api';

export const DEFAULT_QUERY: TransactionsQuery = {
  sort: 'date:desc',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

const KEYS = ['type', 'ticker', 'from', 'to', 'q', 'sort', 'page', 'pageSize'] as const;

/**
 * URL страницы «Сделки» → параметры запроса. Некорректные значения (ручная правка ссылки)
 * не ломают страницу: такой параметр просто отбрасывается.
 */
export function parseTransactionsQuery(params: URLSearchParams): TransactionsQuery {
  const query: TransactionsQuery = { ...DEFAULT_QUERY };
  for (const key of KEYS) {
    const value = params.get(key);
    if (value === null) continue;
    const parsed = transactionsQuerySchema.safeParse({ [key]: value });
    if (parsed.success) Object.assign(query, { [key]: parsed.data[key] });
  }
  return query;
}

/** Параметры → URL; значения по умолчанию не пишутся, чтобы ссылка оставалась короткой. */
export function serializeTransactionsQuery(query: TransactionsQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = query[key];
    if (value === undefined || value === DEFAULT_QUERY[key]) continue;
    params.set(key, String(value));
  }
  return params;
}

/** Смена фильтра, сортировки или размера страницы возвращает на первую страницу. */
export function updateQuery(
  query: TransactionsQuery,
  patch: Partial<TransactionsQuery>,
): TransactionsQuery {
  const resetsPage = Object.keys(patch).some((key) => key !== 'page');
  return { ...query, ...patch, ...(resetsPage && patch.page === undefined ? { page: 1 } : {}) };
}

export function hasFilters(query: TransactionsQuery): boolean {
  return Boolean(query.type ?? query.ticker ?? query.from ?? query.to ?? query.q);
}
