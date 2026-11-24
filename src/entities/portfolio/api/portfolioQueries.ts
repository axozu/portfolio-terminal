import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import {
  http,
  queryKeys,
  type AnalyticsResponse,
  type HistoryResponse,
  type PositionItem,
  type SummaryResponse,
} from '@/shared/api';
import type { HistoryRange } from '@/shared/lib/finance';

export const portfolioQueries = {
  summary: () =>
    queryOptions({
      queryKey: queryKeys.portfolio.summary(),
      queryFn: ({ signal }) => http.get<SummaryResponse>('/portfolio/summary', undefined, signal),
    }),
  history: (range: HistoryRange) =>
    queryOptions({
      queryKey: queryKeys.portfolio.history(range),
      queryFn: ({ signal }) => http.get<HistoryResponse>('/portfolio/history', { range }, signal),
      // При смене периода график не пропадает, пока грузится новый.
      placeholderData: keepPreviousData,
    }),
  positions: () =>
    queryOptions({
      queryKey: queryKeys.portfolio.positions(),
      queryFn: ({ signal }) => http.get<PositionItem[]>('/positions', undefined, signal),
    }),
  analytics: () =>
    queryOptions({
      queryKey: queryKeys.analytics.all,
      queryFn: ({ signal }) => http.get<AnalyticsResponse>('/analytics', undefined, signal),
    }),
};

export function usePortfolioSummary() {
  return useQuery(portfolioQueries.summary());
}

export function usePortfolioHistory(range: HistoryRange) {
  return useQuery(portfolioQueries.history(range));
}

export function usePositions() {
  return useQuery(portfolioQueries.positions());
}

export function useAnalytics() {
  return useQuery(portfolioQueries.analytics());
}
