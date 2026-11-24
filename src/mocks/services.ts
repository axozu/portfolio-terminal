import {
  computePortfolio,
  computeValueHistory,
  quotesFromCandles,
  type PortfolioSnapshot,
  type ValuePoint,
} from '@/shared/lib/finance';
import type { IsoDate, Quote, Transaction } from '@/shared/model';
import type { MockDb } from './db';

/**
 * Производные данные для обработчиков, с кэшем. Ключ кэша — массив сделок:
 * после каждой мутации `MockDb` создаёт новый массив, и кэш устаревает сам.
 */

const quotesCache = new WeakMap<MockDb, Map<string, Quote>>();
const benchmarkCache = new WeakMap<MockDb, Map<IsoDate, number>>();
const snapshotCache = new WeakMap<readonly Transaction[], PortfolioSnapshot>();
const historyCache = new WeakMap<readonly Transaction[], ValuePoint[]>();

function memo<K extends object, V>(cache: WeakMap<K, V>, key: K, compute: () => V): V {
  let value = cache.get(key);
  if (value === undefined) {
    value = compute();
    cache.set(key, value);
  }
  return value;
}

/** Котировки на сегодня: последний close и close предыдущего дня. */
export function getQuotes(db: MockDb): Map<string, Quote> {
  return memo(quotesCache, db, () => quotesFromCandles(db.candles));
}

export function getBenchmarkCloses(db: MockDb): Map<IsoDate, number> {
  return memo(benchmarkCache, db, () => new Map(db.benchmark.map((c) => [c.date, c.close])));
}

export function getSnapshot(db: MockDb): PortfolioSnapshot {
  return memo(snapshotCache, db.transactions, () =>
    computePortfolio(db.transactions, getQuotes(db)),
  );
}

export function getFullHistory(db: MockDb): ValuePoint[] {
  return memo(historyCache, db.transactions, () =>
    computeValueHistory(db.transactions, db.candles, db.dates),
  );
}
