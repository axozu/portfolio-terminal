import type { Candle, Quote, Transaction } from '@/shared/model';
import {
  type Holding,
  type LedgerTotals,
  averagePrice,
  openHoldings,
  replayLedger,
} from './ledger';
import { sum } from './math';

export interface Position {
  ticker: string;
  quantity: number;
  averagePrice: number;
  /** qty × средняя цена. */
  costBasis: number;
  currentPrice: number;
  previousClose: number;
  /** qty × текущая цена. */
  marketValue: number;
  /** Рыночная стоимость − qty × средняя цена. */
  unrealizedPnl: number;
  /** Доля от стоимости покупки; 0, если стоимость покупки нулевая. */
  unrealizedPnlPct: number;
  /** qty × (текущая цена − закрытие предыдущего дня). */
  dayChange: number;
  dayChangePct: number;
  /** Рыночная стоимость / (сумма позиций + кэш). */
  weight: number;
  realizedPnl: number;
  dividends: number;
}

export type QuoteMap = ReadonlyMap<string, Quote>;

export function quoteFromCandles(ticker: string, candles: readonly Candle[]): Quote {
  const last = candles.at(-1);
  if (!last) throw new Error(`No candles for ${ticker}`);
  const previous = candles.at(-2) ?? last;
  return { ticker, price: last.close, previousClose: previous.close };
}

export function quotesFromCandles(
  candlesByTicker: Readonly<Record<string, readonly Candle[]>>,
): Map<string, Quote> {
  const quotes = new Map<string, Quote>();
  for (const [ticker, candles] of Object.entries(candlesByTicker)) {
    quotes.set(ticker, quoteFromCandles(ticker, candles));
  }
  return quotes;
}

function requireQuote(quotes: QuoteMap, ticker: string): Quote {
  const quote = quotes.get(ticker);
  if (!quote) throw new Error(`No quote for ${ticker}`);
  return quote;
}

/**
 * Позиции с рыночными показателями. Вес считается от полной стоимости портфеля
 * (позиции + кэш), поэтому веса позиций в сумме дают 1 − доля кэша.
 */
export function computePositions(
  holdings: readonly Holding[],
  quotes: QuoteMap,
  cash: number,
): Position[] {
  const priced = holdings.map((holding) => {
    const quote = requireQuote(quotes, holding.ticker);
    return { holding, quote, marketValue: holding.quantity * quote.price };
  });
  const totalValue = sum(priced.map((p) => p.marketValue)) + cash;

  return priced.map(({ holding, quote, marketValue }) => {
    const unrealizedPnl = marketValue - holding.costBasis;
    return {
      ticker: holding.ticker,
      quantity: holding.quantity,
      averagePrice: averagePrice(holding),
      costBasis: holding.costBasis,
      currentPrice: quote.price,
      previousClose: quote.previousClose,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPct: holding.costBasis > 0 ? unrealizedPnl / holding.costBasis : 0,
      dayChange: holding.quantity * (quote.price - quote.previousClose),
      dayChangePct:
        quote.previousClose > 0 ? (quote.price - quote.previousClose) / quote.previousClose : 0,
      weight: totalValue > 0 ? marketValue / totalValue : 0,
      realizedPnl: holding.realizedPnl,
      dividends: holding.dividends,
    };
  });
}

export interface PortfolioSummary {
  totalValue: number;
  cash: number;
  positionsValue: number;
  dayChange: number;
  /** Изменение за день относительно стоимости на закрытии предыдущего дня. */
  dayChangePct: number;
  /** Чистые вложения = пополнения − выводы. */
  netInvested: number;
  /** Текущая стоимость − чистые вложения. */
  totalReturn: number;
  /** Простая доходность; `null`, если чистые вложения ≤ 0. */
  totalReturnPct: number | null;
  unrealizedPnl: number;
  realizedPnl: number;
  dividends: number;
  fees: number;
}

/**
 * Сводка из позиций и итогов леджера. Все суммы — агрегаты по позициям,
 * поэтому P/L портфеля всегда сходится с суммой по строкам таблицы.
 */
export function summarizePortfolio(
  positions: readonly Position[],
  cash: number,
  totals: LedgerTotals,
): PortfolioSummary {
  const positionsValue = sum(positions.map((p) => p.marketValue));
  const dayChange = sum(positions.map((p) => p.dayChange));
  const totalValue = positionsValue + cash;
  const previousValue = totalValue - dayChange;
  const netInvested = totals.deposits - totals.withdrawals;
  const totalReturn = totalValue - netInvested;

  return {
    totalValue,
    cash,
    positionsValue,
    dayChange,
    dayChangePct: previousValue > 0 ? dayChange / previousValue : 0,
    netInvested,
    totalReturn,
    totalReturnPct: netInvested > 0 ? totalReturn / netInvested : null,
    unrealizedPnl: sum(positions.map((p) => p.unrealizedPnl)),
    realizedPnl: totals.realizedPnl,
    dividends: totals.dividends,
    fees: totals.fees,
  };
}

export interface PortfolioSnapshot {
  positions: Position[];
  summary: PortfolioSummary;
}

/** Полный расчёт портфеля из сделок и текущих котировок. */
export function computePortfolio(
  transactions: readonly Transaction[],
  quotes: QuoteMap,
): PortfolioSnapshot {
  const { state } = replayLedger(transactions);
  const positions = computePositions(openHoldings(state), quotes, state.cash);
  return { positions, summary: summarizePortfolio(positions, state.cash, state.totals) };
}
