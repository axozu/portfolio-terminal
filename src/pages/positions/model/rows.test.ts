import { describe, expect, it } from 'vitest';
import type { AssetListItem, PositionItem } from '@/shared/api';
import {
  buildPositionRows,
  EMPTY_FILTERS,
  filterPositionRows,
  positionTotals,
  sectorsOf,
} from './rows';

const asset = (
  ticker: string,
  name: string,
  cls: AssetListItem['class'],
  sector: AssetListItem['sector'],
) => ({ ticker, name, class: cls, sector, quantityPrecision: 4 }) as AssetListItem;

const position = (ticker: string, marketValue: number, costBasis: number, dayChange: number) =>
  ({
    ticker,
    marketValue,
    costBasis,
    unrealizedPnl: marketValue - costBasis,
    dayChange,
    weight: marketValue / 1_000,
  }) as PositionItem;

const assets = [
  asset('AAPL', 'Apple Inc.', 'stock', 'technology'),
  asset('JNJ', 'Johnson & Johnson', 'stock', 'healthcare'),
  asset('BTC', 'Bitcoin', 'crypto', null),
];
const rows = buildPositionRows(
  [
    position('AAPL', 300, 200, 10),
    position('JNJ', 100, 120, -5),
    position('BTC', 200, 100, 20),
    position('GONE', 1, 1, 0),
  ],
  assets,
);

describe('buildPositionRows', () => {
  it('joins asset data and drops unknown tickers', () => {
    expect(rows.map((r) => [r.ticker, r.name, r.assetClass, r.sector])).toEqual([
      ['AAPL', 'Apple Inc.', 'stock', 'technology'],
      ['JNJ', 'Johnson & Johnson', 'stock', 'healthcare'],
      ['BTC', 'Bitcoin', 'crypto', null],
    ]);
  });
});

describe('filterPositionRows', () => {
  const tickers = (filters: Partial<typeof EMPTY_FILTERS>) =>
    filterPositionRows(rows, { ...EMPTY_FILTERS, ...filters }).map((r) => r.ticker);

  it('searches ticker and name, case-insensitively', () => {
    expect(tickers({ query: 'john' })).toEqual(['JNJ']);
    expect(tickers({ query: ' btc ' })).toEqual(['BTC']);
  });

  it('filters by class and sector', () => {
    expect(tickers({ assetClass: 'stock' })).toEqual(['AAPL', 'JNJ']);
    expect(tickers({ sector: 'healthcare' })).toEqual(['JNJ']);
    expect(tickers({ assetClass: 'crypto', sector: 'technology' })).toEqual([]);
  });

  it('lists sectors present in positions', () => {
    expect(sectorsOf(rows)).toEqual(['healthcare', 'technology']);
  });
});

describe('positionTotals', () => {
  it('sums values and derives percentages from sums, not averages', () => {
    const totals = positionTotals(rows);
    expect(totals.marketValue).toBe(600);
    expect(totals.unrealizedPnl).toBe(180);
    expect(totals.unrealizedPnlPct).toBeCloseTo(180 / 420, 12);
    expect(totals.dayChange).toBe(25);
    expect(totals.dayChangePct).toBeCloseTo(25 / 575, 12);
    expect(totals.weight).toBeCloseTo(0.6, 12);
  });

  it('is zero for no rows', () => {
    expect(positionTotals([])).toMatchObject({
      marketValue: 0,
      unrealizedPnlPct: 0,
      dayChangePct: 0,
    });
  });
});
