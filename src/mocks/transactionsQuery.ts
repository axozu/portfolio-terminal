import {
  parseSort,
  type TransactionSortField,
  type TransactionsPage,
  type TransactionsQuery,
} from '@/shared/api/contracts';
import { cashEffect, sortLedger } from '@/shared/lib/finance';
import type { Asset, Transaction } from '@/shared/model';

type SortKey = string | number;

function sortKey(tx: Transaction, field: TransactionSortField): SortKey {
  switch (field) {
    case 'date':
      return tx.date;
    case 'type':
      return tx.type;
    case 'ticker':
      return tx.ticker ?? '';
    case 'quantity':
      return tx.quantity ?? Number.NEGATIVE_INFINITY;
    case 'price':
      return tx.price ?? Number.NEGATIVE_INFINITY;
    case 'total':
      return cashEffect(tx);
  }
}

function matches(
  tx: Transaction,
  query: TransactionsQuery,
  assets: ReadonlyMap<string, Asset>,
): boolean {
  if (query.type && tx.type !== query.type) return false;
  if (query.ticker && tx.ticker?.toUpperCase() !== query.ticker.toUpperCase()) return false;
  if (query.from && tx.date < query.from) return false;
  if (query.to && tx.date > query.to) return false;
  if (query.q) {
    const needle = query.q.toLowerCase();
    const name = tx.ticker ? (assets.get(tx.ticker)?.name ?? '') : '';
    const haystack = [tx.ticker ?? '', name, tx.note ?? ''].join(' ').toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

/**
 * Серверная фильтрация, сортировка и пагинация списка сделок.
 * При равных ключах порядок — как в леджере (для `desc` — обратный), поэтому он стабилен.
 */
export function queryTransactions(
  transactions: readonly Transaction[],
  assets: ReadonlyMap<string, Asset>,
  query: TransactionsQuery,
): TransactionsPage {
  const { field, direction } = parseSort(query.sort);
  const sign = direction === 'asc' ? 1 : -1;

  const filtered = sortLedger(transactions)
    .map((tx, order) => ({ tx, order, key: sortKey(tx, field) }))
    .filter(({ tx }) => matches(tx, query, assets));

  filtered.sort((a, b) => {
    if (a.key < b.key) return -sign;
    if (a.key > b.key) return sign;
    return (a.order - b.order) * sign;
  });

  const start = (query.page - 1) * query.pageSize;
  return {
    items: filtered.slice(start, start + query.pageSize).map(({ tx }) => tx),
    total: filtered.length,
    page: query.page,
    pageSize: query.pageSize,
  };
}
