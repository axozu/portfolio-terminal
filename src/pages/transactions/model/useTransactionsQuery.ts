import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { TransactionsQuery } from '@/shared/api';
import { parseTransactionsQuery, serializeTransactionsQuery, updateQuery } from './queryParams';

/** Состояние таблицы сделок живёт в URL: ссылкой можно поделиться, «Назад» работает. */
export function useTransactionsQuery() {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => parseTransactionsQuery(params), [params]);

  const setQuery = useCallback(
    (patch: Partial<TransactionsQuery>) => {
      setParams(serializeTransactionsQuery(updateQuery(query, patch)), { replace: true });
    },
    [query, setParams],
  );

  return { query, setQuery };
}
