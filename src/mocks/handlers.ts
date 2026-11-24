import { HttpResponse } from 'msw';
import type {
  AnalyticsResponse,
  AssetListItem,
  CandlesResponse,
  HistoryResponse,
  PositionItem,
  SummaryResponse,
  TransactionsPage,
} from '@/shared/api/contracts';
import { transactionsQuerySchema } from '@/shared/api/contracts';
import { addDaysIso } from '@/shared/lib/date';
import {
  allocationByClass,
  allocationBySector,
  annualizedVolatility,
  benchmarkWithFlows,
  dailyReturns,
  dividendsByMonth,
  drawdownSeries,
  filterByRange,
  isHistoryRange,
  maxDrawdown,
  monthlyReturns,
  RISK_FREE_RATE,
  sharpeRatio,
  validateDeletion,
  validateTransaction,
  type HistoryRange,
  type TransactionValidationResult,
} from '@/shared/lib/finance';
import type { Transaction } from '@/shared/model';
import type { MockDb } from './db';
import { createRouter, errorResponse, type NetworkSettings } from './network';
import { getBenchmarkCloses, getFullHistory, getQuotes, getSnapshot } from './services';
import { queryTransactions } from './transactionsQuery';

const SPARKLINE_DAYS = 30;

function readRange(url: URL, fallback: HistoryRange): HistoryRange | null {
  const value = url.searchParams.get('range') ?? fallback;
  return isHistoryRange(value) ? value : null;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    const body: unknown = await request.json();
    return body;
  } catch {
    return null;
  }
}

function rejection(result: Extract<TransactionValidationResult, { ok: false }>) {
  return errorResponse(422, result.conflict ? 'ledger_conflict' : 'validation_failed', {
    fieldErrors: result.fieldErrors,
    conflict: result.conflict,
  });
}

/**
 * Обработчики фейкового API. Все расчёты — через чистые функции `@/shared/lib/finance`,
 * те же, что использует клиент.
 */
export function createHandlers(db: MockDb, settings: NetworkSettings) {
  const route = createRouter(settings);
  const validationContext = (editingId?: string) => ({
    today: db.today,
    assets: db.constraints,
    transactions: db.transactions,
    editingId,
  });

  return [
    route.get('/api/assets', () => {
      const quotes = getQuotes(db);
      return HttpResponse.json<AssetListItem[]>(
        db.assets.map((asset) => {
          const quote = quotes.get(asset.ticker);
          return {
            ...asset,
            price: quote?.price ?? 0,
            previousClose: quote?.previousClose ?? 0,
            historyStart: db.constraints.get(asset.ticker)?.historyStart ?? db.today,
          };
        }),
      );
    }),

    route.get<{ ticker: string }>('/api/assets/:ticker/candles', ({ params, url }) => {
      const ticker = params.ticker.toUpperCase();
      const candles = db.candles[ticker];
      if (!candles) return errorResponse(404, 'not_found');
      const range = readRange(url, '1Y');
      if (!range) return errorResponse(400, 'bad_request');
      return HttpResponse.json<CandlesResponse>({
        ticker,
        range,
        candles: filterByRange(candles, range, db.today),
      });
    }),

    route.get('/api/portfolio/summary', () => {
      const { summary, positions } = getSnapshot(db);
      return HttpResponse.json<SummaryResponse>({
        ...summary,
        asOf: db.today,
        allocation: allocationByClass(positions, db.assetsByTicker, summary.cash),
      });
    }),

    route.get('/api/portfolio/history', ({ url }) => {
      const range = readRange(url, 'ALL');
      if (!range) return errorResponse(400, 'bad_request');
      const points = filterByRange(getFullHistory(db), range, db.today);
      const benchmark = benchmarkWithFlows(points, getBenchmarkCloses(db));
      return HttpResponse.json<HistoryResponse>({
        range,
        points: points.map((p, i) => ({
          date: p.date,
          value: p.value,
          netInvested: p.netInvested,
          benchmark: benchmark[i] ?? p.value,
        })),
      });
    }),

    route.get('/api/positions', () => {
      const sparklineFrom = addDaysIso(db.today, -SPARKLINE_DAYS);
      const positions = [...getSnapshot(db).positions].sort(
        (a, b) => b.marketValue - a.marketValue,
      );
      return HttpResponse.json<PositionItem[]>(
        positions.map((position) => ({
          ...position,
          sparkline: (db.candles[position.ticker] ?? [])
            .filter((c) => c.date >= sparklineFrom)
            .map((c) => c.close),
        })),
      );
    }),

    route.get('/api/transactions', ({ url }) => {
      const query = transactionsQuerySchema.safeParse(Object.fromEntries(url.searchParams));
      if (!query.success) return errorResponse(400, 'bad_request');
      return HttpResponse.json<TransactionsPage>(
        queryTransactions(db.transactions, db.assetsByTicker, query.data),
      );
    }),

    route.post('/api/transactions', async ({ request }) => {
      const result = validateTransaction(await readJson(request), validationContext());
      if (!result.ok) return rejection(result);
      return HttpResponse.json<Transaction>(db.add(result.value), { status: 201 });
    }),

    route.put<{ id: string }>('/api/transactions/:id', async ({ request, params }) => {
      if (!db.findTransaction(params.id)) return errorResponse(404, 'not_found');
      const result = validateTransaction(await readJson(request), validationContext(params.id));
      if (!result.ok) return rejection(result);
      return HttpResponse.json<Transaction>(db.update(params.id, result.value));
    }),

    route.delete<{ id: string }>('/api/transactions/:id', ({ params }) => {
      if (!db.findTransaction(params.id)) return errorResponse(404, 'not_found');
      const conflict = validateDeletion(params.id, db.transactions);
      if (conflict) return errorResponse(422, 'ledger_conflict', { conflict });
      db.remove(params.id);
      return new HttpResponse(null, { status: 204 });
    }),

    route.get('/api/analytics', () => {
      const history = getFullHistory(db);
      const returns = dailyReturns(history);
      const { positions } = getSnapshot(db);
      return HttpResponse.json<AnalyticsResponse>({
        monthlyReturns: monthlyReturns(history),
        drawdown: drawdownSeries(history),
        maxDrawdown: maxDrawdown(history),
        volatility: annualizedVolatility(returns),
        sharpe: sharpeRatio(returns),
        riskFreeRate: RISK_FREE_RATE,
        dividendsByMonth: dividendsByMonth(db.transactions),
        sectors: allocationBySector(positions, db.assetsByTicker),
      });
    }),

    route.post('/api/demo/reset', () => {
      db.reset();
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}
