import type { AssetListItem, PositionItem } from '@/shared/api';
import type { AssetClass, Sector } from '@/shared/model';

export interface PositionRow extends PositionItem {
  name: string;
  assetClass: AssetClass;
  sector: Sector | null;
  quantityPrecision: number;
}

/** Позиции + справочник активов → строки таблицы. Позиции без актива в справочнике пропускаются. */
export function buildPositionRows(
  positions: readonly PositionItem[],
  assets: readonly AssetListItem[],
): PositionRow[] {
  const byTicker = new Map(assets.map((a) => [a.ticker, a]));
  return positions.flatMap((position) => {
    const asset = byTicker.get(position.ticker);
    if (!asset) return [];
    return [
      {
        ...position,
        name: asset.name,
        assetClass: asset.class,
        sector: asset.sector,
        quantityPrecision: asset.quantityPrecision,
      },
    ];
  });
}

export interface PositionFilters {
  query: string;
  assetClass: AssetClass | 'all';
  sector: Sector | 'all';
}

export const EMPTY_FILTERS: PositionFilters = { query: '', assetClass: 'all', sector: 'all' };

export function filterPositionRows(
  rows: readonly PositionRow[],
  filters: PositionFilters,
): PositionRow[] {
  const needle = filters.query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (filters.assetClass === 'all' || row.assetClass === filters.assetClass) &&
      (filters.sector === 'all' || row.sector === filters.sector) &&
      (needle === '' ||
        row.ticker.toLowerCase().includes(needle) ||
        row.name.toLowerCase().includes(needle)),
  );
}

/** Сектора, которые реально есть в позициях, — для фильтра. */
export function sectorsOf(rows: readonly PositionRow[]): Sector[] {
  return [...new Set(rows.flatMap((r) => (r.sector ? [r.sector] : [])))].sort();
}

export interface PositionTotals {
  marketValue: number;
  costBasis: number;
  unrealizedPnl: number;
  /** P/L к суммарной стоимости покупки отфильтрованных позиций. */
  unrealizedPnlPct: number;
  dayChange: number;
  /** Изменение за день к стоимости на вчерашнем закрытии. */
  dayChangePct: number;
  weight: number;
}

/** Итоговая строка по отфильтрованным позициям. */
export function positionTotals(rows: readonly PositionRow[]): PositionTotals {
  const sum = (pick: (r: PositionRow) => number) => rows.reduce((acc, r) => acc + pick(r), 0);
  const marketValue = sum((r) => r.marketValue);
  const costBasis = sum((r) => r.costBasis);
  const unrealizedPnl = sum((r) => r.unrealizedPnl);
  const dayChange = sum((r) => r.dayChange);
  const previousValue = marketValue - dayChange;
  return {
    marketValue,
    costBasis,
    unrealizedPnl,
    unrealizedPnlPct: costBasis > 0 ? unrealizedPnl / costBasis : 0,
    dayChange,
    dayChangePct: previousValue > 0 ? dayChange / previousValue : 0,
    weight: sum((r) => r.weight),
  };
}
