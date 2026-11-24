import { createColumnHelper } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import type { Formatters } from '@/shared/i18n';
import { cashEffect } from '@/shared/lib/finance';
import type { Transaction } from '@/shared/model';
import { Button } from '@/shared/ui/button';
import type { DataTableFeatures } from '@/shared/ui/tableFeatures';

const column = createColumnHelper<DataTableFeatures, Transaction>();
const right = { align: 'right' } as const;

interface ColumnActions {
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

/** Колонки таблицы сделок. Сортируемые колонки совпадают с полями сортировки API. */
export function transactionColumns(t: TFunction, format: Formatters, actions: ColumnActions) {
  const dash = <span className="text-muted-foreground">—</span>;
  return column.columns([
    column.accessor('date', {
      header: t('transactionsPage.columns.date'),
      cell: (info) => <span className="num">{format.date(info.getValue())}</span>,
    }),
    column.accessor('type', {
      header: t('transactionsPage.columns.type'),
      cell: (info) => t(`transactionType.${info.getValue()}`),
    }),
    column.accessor('ticker', {
      header: t('transactionsPage.columns.asset'),
      cell: (info) => {
        const ticker = info.getValue();
        return ticker ? (
          <Link
            to={`/assets/${ticker}`}
            className="num font-medium text-foreground hover:underline"
          >
            {ticker}
          </Link>
        ) : (
          dash
        );
      },
    }),
    column.accessor('quantity', {
      header: t('transactionsPage.columns.quantity'),
      cell: (info) => {
        const value = info.getValue();
        return value === null ? dash : <span className="num">{format.quantity(value, 8)}</span>;
      },
      meta: right,
    }),
    column.accessor('price', {
      header: t('transactionsPage.columns.price'),
      cell: (info) => {
        const value = info.getValue();
        return value === null ? dash : <span className="num">{format.price(value)}</span>;
      },
      meta: right,
    }),
    column.accessor('fee', {
      header: t('transactionsPage.columns.fee'),
      cell: (info) => (
        <span className="num text-muted-foreground">{format.money(info.getValue())}</span>
      ),
      enableSorting: false,
      meta: { align: 'right', className: 'max-lg:hidden' },
    }),
    column.accessor((tx) => cashEffect(tx), {
      id: 'total',
      header: t('transactionsPage.columns.total'),
      cell: (info) => (
        <span className="num text-foreground">
          {format.money(info.getValue(), { signed: true })}
        </span>
      ),
      meta: right,
    }),
    column.accessor('note', {
      header: t('transactionsPage.columns.note'),
      cell: (info) => (
        <span className="block max-w-48 truncate text-muted-foreground">{info.getValue()}</span>
      ),
      enableSorting: false,
      meta: { className: 'max-xl:hidden' },
    }),
    column.display({
      id: 'actions',
      header: () => <span className="sr-only">{t('transactionsPage.columns.actions')}</span>,
      cell: ({ row }) => {
        const date = format.date(row.original.date);
        return (
          <span className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={t('transactionsPage.edit', { date })}
              onClick={() => {
                actions.onEdit(row.original);
              }}
            >
              <Pencil aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:text-loss"
              aria-label={t('transactionsPage.delete', { date })}
              onClick={() => {
                actions.onDelete(row.original);
              }}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </span>
        );
      },
      meta: right,
    }),
  ]);
}
