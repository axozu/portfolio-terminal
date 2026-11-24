import { describe, expect, it } from 'vitest';
import { differenceInCalendarDays } from 'date-fns';
import { parseIsoDate } from '@/shared/lib/date';
import {
  computePortfolio,
  computeValueHistory,
  hasPrecision,
  maxDrawdown,
  quotesFromCandles,
  replayLedger,
  validateLedger,
} from '@/shared/lib/finance';
import { ASSET_CLASSES } from '@/shared/model';
import { generateDemoData, HISTORY_TRADING_DAYS } from './index';
import { createRandom } from './random';

const TODAY = '2026-11-24'; // вторник
const data = generateDemoData({ today: TODAY });
const assetsByTicker = new Map(data.assets.map((a) => [a.ticker, a]));

describe('createRandom', () => {
  it('is deterministic for a seed', () => {
    const a = createRandom(7);
    const b = createRandom(7);
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(
      Array.from({ length: 5 }, () => b.next()),
    );
  });

  it('produces roughly standard normal values', () => {
    const rng = createRandom(1);
    const values = Array.from({ length: 20_000 }, () => rng.normal());
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
    expect(Math.abs(avg)).toBeLessThan(0.03);
    expect(variance).toBeGreaterThan(0.95);
    expect(variance).toBeLessThan(1.05);
  });
});

describe('generateDemoData', () => {
  it('is deterministic: the same input gives the same data', () => {
    expect(generateDemoData({ today: TODAY })).toEqual(data);
  });

  it('depends on the seed', () => {
    const other = generateDemoData({ today: TODAY, seed: 1 });
    expect(other.candles.AAPL?.[0]?.close).not.toBe(data.candles.AAPL?.[0]?.close);
  });

  it('has about 20 assets of every class with sane precision', () => {
    expect(data.assets.length).toBeGreaterThanOrEqual(18);
    expect(new Set(data.assets.map((a) => a.class))).toEqual(new Set(ASSET_CLASSES));
    for (const asset of data.assets) {
      expect(asset.quantityPrecision).toBe(asset.class === 'crypto' ? 8 : 4);
      if (asset.class === 'crypto' || asset.class === 'bond') expect(asset.sector).toBeNull();
    }
  });
});

describe('price history', () => {
  it('spans about three years of trading days and ends today', () => {
    expect(data.dates).toHaveLength(HISTORY_TRADING_DAYS);
    expect(data.dates.at(-1)).toBe(TODAY);
    const span = differenceInCalendarDays(
      parseIsoDate(data.dates.at(-1) ?? ''),
      parseIsoDate(data.dates[0] ?? ''),
    );
    expect(span).toBeGreaterThan(365 * 3 - 10);
    expect(span).toBeLessThan(365 * 3 + 10);
  });

  it('ends on the last weekday when today is a weekend', () => {
    const weekend = generateDemoData({ today: '2026-11-29' }); // воскресенье
    expect(weekend.dates.at(-1)).toBe('2026-11-27');
  });

  it('has one valid candle per date for every asset and the benchmark', () => {
    for (const candles of [...Object.values(data.candles), data.benchmark]) {
      expect(candles.map((c) => c.date)).toEqual(data.dates);
      for (const c of candles) {
        expect(c.low).toBeGreaterThan(0);
        expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
        expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
        expect(c.volume).toBeGreaterThanOrEqual(0);
      }
    }
    expect(Object.keys(data.candles).sort()).toEqual([...assetsByTicker.keys()].sort());
  });

  it('makes crypto far more volatile than stocks, and stocks more than bonds', () => {
    const vol = (ticker: string) => {
      const closes = data.candles[ticker]?.map((c) => c.close) ?? [];
      const r = closes.slice(1).map((c, i) => Math.log(c / (closes[i] ?? c)));
      const m = r.reduce((s, v) => s + v, 0) / r.length;
      return Math.sqrt(r.reduce((s, v) => s + (v - m) ** 2, 0) / r.length);
    };
    expect(vol('BTC')).toBeGreaterThan(vol('AAPL') * 1.5);
    expect(vol('AAPL')).toBeGreaterThan(vol('BND') * 2);
  });

  it('shifts with the current date but keeps the same shape', () => {
    const later = generateDemoData({ today: '2027-03-10' });
    expect(later.dates.at(-1)).toBe('2027-03-10');
    expect(later.candles.AAPL?.map((c) => c.close)).toEqual(data.candles.AAPL?.map((c) => c.close));
  });
});

describe('transaction ledger', () => {
  const { transactions } = data;

  it('has about 150 transactions of every type with unique ids', () => {
    expect(transactions.length).toBeGreaterThanOrEqual(120);
    expect(transactions.length).toBeLessThanOrEqual(180);
    expect(new Set(transactions.map((t) => t.type))).toEqual(
      new Set(['buy', 'sell', 'dividend', 'deposit', 'withdrawal']),
    );
    expect(new Set(transactions.map((t) => t.id)).size).toBe(transactions.length);
  });

  it('is consistent: no negative cash, no overselling, dividends only on held assets', () => {
    expect(validateLedger(transactions)).toBeNull();
  });

  it('never lets cash go below zero on any day', () => {
    const history = computeValueHistory(transactions, data.candles, data.dates);
    expect(Math.min(...history.map((p) => p.cash))).toBeGreaterThanOrEqual(0);
  });

  it('starts with a deposit and stays within the price history', () => {
    expect(transactions[0]?.type).toBe('deposit');
    const first = data.dates[0] ?? '';
    const last = data.dates.at(-1) ?? '';
    for (const tx of transactions) {
      expect(tx.date >= first && tx.date <= last).toBe(true);
    }
  });

  it('trades at that day close, with valid precision and non-negative fees', () => {
    for (const tx of transactions) {
      if (tx.type !== 'buy' && tx.type !== 'sell') continue;
      const asset = assetsByTicker.get(tx.ticker);
      expect(asset).toBeDefined();
      expect(tx.quantity).toBeGreaterThan(0);
      expect(hasPrecision(tx.quantity, asset?.quantityPrecision ?? 0)).toBe(true);
      expect(tx.fee).toBeGreaterThanOrEqual(0);
      expect(tx.price).toBe(data.candles[tx.ticker]?.find((c) => c.date === tx.date)?.close);
    }
  });

  it('keeps non-trade fields null as in the schema', () => {
    for (const tx of transactions) {
      if (tx.type === 'deposit' || tx.type === 'withdrawal') expect(tx.ticker).toBeNull();
      if (tx.type !== 'buy' && tx.type !== 'sell') {
        expect([tx.quantity, tx.price, tx.fee]).toEqual([null, null, 0]);
        expect(tx.amount).toBeGreaterThan(0);
      }
    }
  });
});

describe('resulting portfolio', () => {
  const { summary } = computePortfolio(data.transactions, quotesFromCandles(data.candles));
  const history = computeValueHistory(data.transactions, data.candles, data.dates);

  it('is worth $100–250k', () => {
    expect(summary.totalValue).toBeGreaterThan(100_000);
    expect(summary.totalValue).toBeLessThan(250_000);
  });

  it('is in profit over the whole period', () => {
    expect(summary.totalReturn).toBeGreaterThan(0);
  });

  it('has a noticeable drawdown', () => {
    expect(maxDrawdown(history)).toBeLessThan(-0.1);
  });

  it('agrees with the history on the last day', () => {
    expect(history.at(-1)?.value).toBeCloseTo(summary.totalValue, 6);
  });

  it('stays valid for other current dates', () => {
    for (const today of ['2026-12-01', '2027-02-28', '2027-07-04', '2028-02-29']) {
      const other = generateDemoData({ today });
      expect(replayLedger(other.transactions).violations).toEqual([]);
      const { summary: s } = computePortfolio(other.transactions, quotesFromCandles(other.candles));
      expect(s.totalValue).toBeGreaterThan(100_000);
      expect(s.totalValue).toBeLessThan(250_000);
      expect(s.totalReturn).toBeGreaterThan(0);
    }
  });
});
