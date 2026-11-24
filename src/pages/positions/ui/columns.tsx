import { createColumnHelper } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { Link } from 'react-router';
import type { Formatters } from '@/shared/i18n';
import { Delta } from '@/shared/ui/Delta';
import { Flash } from '@/shared/ui/Flash';
import type { DataTableFeatures } from '@/shared/ui/tableFeatures';
import { Sparkline } from '@/shared/ui/Sparkline';
import type { PositionRow } from '../model/rows';

const column = createColumnHelper<DataTableFeatures, PositionRow>();
const right = { align: 'right' } as const;

/** Колонки таблицы позиций. Ячейки только форматируют готовые значения — расчёты в модели. */
export function positionColumns(t: TFunction, format: Formatters) {
  return column.columns([
    column.accessor('ticker', {
      header: t('positions.columns.asset'),
      cell: ({ row }) => (
        <Link
          to={`/assets/${row.original.ticker}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="block max-w-40 focus-visible:outline-offset-0"
        >
          <span className="num block font-medium text-foreground">{row.original.ticker}</span>
          <span className="block truncate text-xs text-muted-foreground">{row.original.name}</span>
        </Link>
      ),
    }),
    column.accessor('assetClass', {
      header: t('positions.columns.class'),
      cell: (info) => (
        <span className="text-muted-foreground">{t(`assetClass.${info.getValue()}`)}</span>
      ),
      meta: { className: 'max-lg:hidden' },
    }),
    column.accessor('quantity', {
      header: t('positions.columns.quantity'),
      cell: ({ row }) => (
        <span className="num">
          {format.quantity(row.original.quantity, row.original.quantityPrecision)}
        </span>
      ),
      meta: right,
    }),
    column.accessor('averagePrice', {
      header: t('positions.columns.avgPrice'),
      cell: (info) => (
        <span className="num text-muted-foreground">{format.price(info.getValue())}</span>
      ),
      meta: right,
    }),
    column.accessor('currentPrice', {
      header: t('positions.columns.price'),
      cell: (info) => (
        <Flash value={info.getValue()} className="num px-0.5">
          {format.price(info.getValue())}
        </Flash>
      ),
      meta: right,
    }),
    column.accessor('dayChangePct', {
      header: t('positions.columns.dayChange'),
      cell: (info) => <Delta value={info.getValue()} kind="percent" />,
      meta: right,
    }),
    column.accessor('marketValue', {
      header: t('positions.columns.value'),
      cell: (info) => <span className="num text-foreground">{format.money(info.getValue())}</span>,
      meta: right,
    }),
    column.accessor('unrealizedPnl', {
      header: t('positions.columns.pnl'),
      cell: (info) => <Delta value={info.getValue()} kind="money" arrow={false} />,
      meta: right,
    }),
    column.accessor('unrealizedPnlPct', {
      header: t('positions.columns.pnlPct'),
      cell: (info) => <Delta value={info.getValue()} kind="percent" />,
      meta: right,
    }),
    column.accessor('weight', {
      header: t('positions.columns.weight'),
      cell: (info) => (
        <span className="num text-muted-foreground">
          {format.percent(info.getValue(), { decimals: 1 })}
        </span>
      ),
      meta: right,
    }),
    column.display({
      id: 'sparkline',
      header: t('positions.columns.trend'),
      cell: ({ row }) => <Sparkline values={row.original.sparkline} className="ml-auto" />,
      meta: { align: 'right', className: 'max-md:hidden' },
    }),
  ]);
}
