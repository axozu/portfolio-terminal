import { z } from 'zod';
import type {
  AllocationSlice,
  DatedValue,
  FieldErrors,
  HistoryRange,
  LedgerConflict,
  MonthlyAmount,
  MonthlyReturn,
  PortfolioSummary,
  Position,
} from '@/shared/lib/finance';
import {
  TRANSACTION_TYPES,
  type Asset,
  type AssetClass,
  type Candle,
  type IsoDate,
  type Sector,
  type Transaction,
} from '@/shared/model';

/**
 * Контракт фейкового API: типы ответов и параметры запросов.
 * Его используют и обработчики MSW, и клиент — расхождение поймает компилятор.
 */

export interface AssetListItem extends Asset {
  price: number;
  previousClose: number;
  /** Первая дата истории цен — раньше неё сделку не создать. */
  historyStart: IsoDate;
}

export interface CandlesResponse {
  ticker: string;
  range: HistoryRange;
  candles: Candle[];
}

export interface SummaryResponse extends PortfolioSummary {
  /** Дата цен, на которую посчитана сводка. */
  asOf: IsoDate;
  allocation: AllocationSlice<AssetClass | 'cash'>[];
}

export interface HistoryPoint {
  date: IsoDate;
  value: number;
  netInvested: number;
  /** Стоимость, если бы те же пополнения вкладывались в бенчмарк. */
  benchmark: number;
}

export interface HistoryResponse {
  range: HistoryRange;
  points: HistoryPoint[];
}

export interface PositionItem extends Position {
  /** Цены закрытия примерно за последние 30 дней — для спарклайна. */
  sparkline: number[];
}

export interface AnalyticsResponse {
  monthlyReturns: MonthlyReturn[];
  drawdown: DatedValue[];
  maxDrawdown: number;
  volatility: number | null;
  sharpe: number | null;
  riskFreeRate: number;
  dividendsByMonth: MonthlyAmount[];
  sectors: AllocationSlice<Sector | AssetClass>[];
}

export const TRANSACTION_SORT_FIELDS = [
  'date',
  'type',
  'ticker',
  'quantity',
  'price',
  'total',
] as const;
export type TransactionSortField = (typeof TRANSACTION_SORT_FIELDS)[number];
export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];
export type TransactionSort = `${TransactionSortField}:${SortDirection}`;

export const TRANSACTION_SORTS = TRANSACTION_SORT_FIELDS.flatMap((field) =>
  SORT_DIRECTIONS.map((dir): TransactionSort => `${field}:${dir}`),
);

export function parseSort(sort: TransactionSort): {
  field: TransactionSortField;
  direction: SortDirection;
} {
  const [field, direction] = sort.split(':');
  return {
    field: TRANSACTION_SORT_FIELDS.find((f) => f === field) ?? 'date',
    direction: direction === 'asc' ? 'asc' : 'desc',
  };
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

const isoDateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);

/** Параметры списка сделок. Разбирает и query-строку API, и URL страницы «Сделки». */
export const transactionsQuerySchema = z.object({
  type: z.preprocess(emptyToUndefined, z.enum(TRANSACTION_TYPES).optional()),
  ticker: z.preprocess(emptyToUndefined, z.string().optional()),
  from: z.preprocess(emptyToUndefined, isoDateParam.optional()),
  to: z.preprocess(emptyToUndefined, isoDateParam.optional()),
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  sort: z.preprocess(
    emptyToUndefined,
    z.custom<TransactionSort>((v) => TRANSACTION_SORTS.some((s) => s === v)).default('date:desc'),
  ),
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
  pageSize: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  ),
});

export type TransactionsQuery = z.infer<typeof transactionsQuerySchema>;

export interface TransactionsPage {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

export type ApiErrorCode =
  'validation_failed' | 'ledger_conflict' | 'not_found' | 'bad_request' | 'internal_error';

export interface ApiErrorBody {
  code: ApiErrorCode;
  fieldErrors?: FieldErrors;
  conflict?: LedgerConflict;
}
