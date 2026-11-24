import { queryOptions, useQuery } from '@tanstack/react-query';
import { http, queryKeys, type AssetListItem, type CandlesResponse } from '@/shared/api';
import type { HistoryRange } from '@/shared/lib/finance';

export const assetQueries = {
  /** Справочник активов меняется только при перезагрузке — кэшируем навсегда. */
  list: () =>
    queryOptions({
      queryKey: queryKeys.assets.list(),
      queryFn: ({ signal }) => http.get<AssetListItem[]>('/assets', undefined, signal),
      staleTime: Infinity,
    }),
  candles: (ticker: string, range: HistoryRange) =>
    queryOptions({
      queryKey: queryKeys.assets.candles(ticker, range),
      queryFn: ({ signal }) =>
        http.get<CandlesResponse>(
          `/assets/${encodeURIComponent(ticker)}/candles`,
          { range },
          signal,
        ),
      staleTime: Infinity,
    }),
};

export function useAssets() {
  return useQuery(assetQueries.list());
}

export function useAssetCandles(ticker: string, range: HistoryRange) {
  return useQuery(assetQueries.candles(ticker, range));
}
