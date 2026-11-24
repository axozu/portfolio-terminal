import { useMemo } from 'react';
import { useAssets } from '@/entities/asset';
import type { PositionItem, SummaryResponse } from '@/shared/api';
import { allocationByClass, repricePositions, repriceSummary } from '@/shared/lib/finance';
import { livePriceMap, useLivePricesStore } from '@/shared/store/livePrices';
import { usePortfolioSummary, usePositions } from '../api/portfolioQueries';

/**
 * Результат «живых» данных: то же сужение типов, что у запроса TanStack
 * (после проверок isPending/isError данные гарантированно есть).
 */
export type LiveResult<T> = { refetch: () => void } & (
  | { isPending: true; isError: false; data: undefined }
  | { isPending: false; isError: true; data: T | undefined }
  | { isPending: false; isError: false; data: T }
);

function toResult<T>(
  data: T | undefined,
  isPending: boolean,
  isError: boolean,
  refetch: () => void,
): LiveResult<T> {
  if (isError) return { isPending: false, isError: true, data, refetch };
  if (isPending || data === undefined)
    return { isPending: true, isError: false, data: undefined, refetch };
  return { isPending: false, isError: false, data, refetch };
}

/**
 * Портфель от live-цен. Данные API (позиции, итоги леджера) пересчитываются чистыми функциями
 * при каждом тике, поэтому стоимость, P/L и изменение за день везде сходятся между собой.
 */
export function useLivePositions(): LiveResult<PositionItem[]> {
  const positions = usePositions();
  const summary = usePortfolioSummary();
  const prices = useLivePricesStore((s) => s.prices);
  const data = useMemo(
    () =>
      positions.data && summary.data
        ? repricePositions(positions.data, livePriceMap(prices), summary.data.cash)
        : undefined,
    [positions.data, summary.data, prices],
  );
  return toResult(
    data,
    positions.isPending || summary.isPending,
    positions.isError || summary.isError,
    () => {
      void positions.refetch();
      void summary.refetch();
    },
  );
}

export function useLiveSummary(): LiveResult<SummaryResponse> {
  const summary = usePortfolioSummary();
  const positions = useLivePositions();
  const { data: assets } = useAssets();
  const data = useMemo(() => {
    if (!summary.data || !positions.data) return summary.data;
    const live = repriceSummary(summary.data, positions.data);
    const allocation = assets
      ? allocationByClass(positions.data, new Map(assets.map((a) => [a.ticker, a])), live.cash)
      : live.allocation;
    return { ...live, allocation };
  }, [summary.data, positions.data, assets]);
  return toResult(data, summary.isPending, summary.isError, () => {
    void summary.refetch();
    positions.refetch();
  });
}

/** Текущая цена актива: live, если фид уже дал тик, иначе — из API. */
export function useLivePrice(ticker: string, fallback: number): number {
  return useLivePricesStore((s) => s.prices[ticker] ?? fallback);
}
