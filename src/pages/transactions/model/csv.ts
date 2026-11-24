import { cashEffect, roundTo } from '@/shared/lib/finance';
import type { Transaction } from '@/shared/model';

/**
 * CSV для выгрузки: машиночитаемый формат (ISO-даты, точка в числах, английские заголовки),
 * чтобы файл одинаково открывался в любой локали и импортировался в таблицы.
 */
const HEADER = [
  'date',
  'type',
  'ticker',
  'name',
  'quantity',
  'price',
  'fee',
  'amount',
  'cash_effect',
  'note',
];

/** Строка, начинающаяся как формула, в Excel выполнится. Такие строки экранируются апострофом. */
const FORMULA_START = /^[=+\-@\t\r]/;

function escapeText(raw: string): string {
  const value = FORMULA_START.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  // Числа (в том числе отрицательные) пишутся как есть — экранируется только текст.
  return typeof value === 'number' ? String(value) : escapeText(value);
}

export function transactionsToCsv(
  transactions: readonly Transaction[],
  nameOf: (ticker: string) => string | undefined,
): string {
  const rows = transactions.map((tx) =>
    [
      tx.date,
      tx.type,
      tx.ticker,
      tx.ticker ? nameOf(tx.ticker) : null,
      tx.quantity,
      tx.price,
      tx.fee,
      tx.amount,
      roundTo(cashEffect(tx), 2),
      tx.note,
    ]
      .map(cell)
      .join(','),
  );
  return [HEADER.join(','), ...rows].join('\r\n');
}
