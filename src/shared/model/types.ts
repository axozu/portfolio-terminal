/**
 * Доменные типы. Позиции, кэш и стоимость портфеля здесь не хранятся:
 * они вычисляются из списка сделок и цен (см. `@/shared/lib/finance`).
 */

/** Дата в формате ISO `YYYY-MM-DD`, без времени и таймзоны. */
export type IsoDate = string;

/** Месяц в формате `YYYY-MM`. */
export type IsoMonth = string;

export const ASSET_CLASSES = ['stock', 'etf', 'bond', 'crypto'] as const;
/** Облигации моделируются как облигационные фонды (цена за пай). */
export type AssetClass = (typeof ASSET_CLASSES)[number];

/** Ключи секторов — они же ключи i18n. */
export const SECTORS = [
  'technology',
  'communication',
  'consumer_discretionary',
  'consumer_staples',
  'healthcare',
  'energy',
  'financials',
  'real_estate',
  'diversified',
] as const;
export type Sector = (typeof SECTORS)[number];

export interface Asset {
  ticker: string;
  /** Название не переводится. */
  name: string;
  class: AssetClass;
  /** `null` для крипты и облигационных фондов. */
  sector: Sector | null;
  /** Допустимое число знаков после запятой в количестве: 4 для акций/ETF, 8 для крипты. */
  quantityPrecision: number;
}

export interface Candle {
  date: IsoDate;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Текущая цена и цена закрытия предыдущего дня. */
export interface Quote {
  ticker: string;
  price: number;
  previousClose: number;
}

export const TRANSACTION_TYPES = ['buy', 'sell', 'dividend', 'deposit', 'withdrawal'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

interface TransactionBase {
  id: string;
  date: IsoDate;
  note?: string;
}

export interface TradeTransaction extends TransactionBase {
  type: 'buy' | 'sell';
  ticker: string;
  quantity: number;
  /** Цена за единицу, USD. */
  price: number;
  amount: null;
  /** Комиссия, USD, ≥ 0. */
  fee: number;
}

export interface DividendTransaction extends TransactionBase {
  type: 'dividend';
  ticker: string;
  quantity: null;
  price: null;
  /** Сумма дивиденда, USD. */
  amount: number;
  fee: 0;
}

export interface CashTransaction extends TransactionBase {
  type: 'deposit' | 'withdrawal';
  ticker: null;
  quantity: null;
  price: null;
  amount: number;
  fee: 0;
}

/**
 * Сделка. Структурно совпадает с плоским интерфейсом из ТЗ
 * (все поля присутствуют, неиспользуемые — `null`), но размечена по `type`,
 * поэтому TypeScript сужает типы полей в `switch (tx.type)`.
 */
export type Transaction = TradeTransaction | DividendTransaction | CashTransaction;
