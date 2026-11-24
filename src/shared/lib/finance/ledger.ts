import type { IsoDate, Transaction } from '@/shared/model';
import { MONEY_EPSILON, QUANTITY_EPSILON } from './constants';

/**
 * Леджер: последовательное применение сделок к состоянию «кэш + позиции».
 *
 * Учёт по средней стоимости (average cost):
 * - покупка: стоимость позиции += qty × price + fee (комиссия входит в стоимость);
 * - продажа: средняя цена не меняется, стоимость позиции уменьшается на qty × avg,
 *   реализованный P/L = (price − avg) × qty − fee.
 */

export interface Holding {
  ticker: string;
  quantity: number;
  /** Стоимость покупки открытой части позиции (qty × средняя цена). */
  costBasis: number;
  /** Реализованный P/L за всё время, включая закрытые позиции. */
  realizedPnl: number;
  /** Полученные дивиденды за всё время. */
  dividends: number;
}

export interface LedgerTotals {
  deposits: number;
  withdrawals: number;
  dividends: number;
  fees: number;
  realizedPnl: number;
}

export interface LedgerState {
  cash: number;
  holdings: Map<string, Holding>;
  totals: LedgerTotals;
}

export type LedgerViolation =
  | {
      transactionId: string;
      date: IsoDate;
      reason: 'insufficient_cash' | 'insufficient_quantity';
      required: number;
      available: number;
    }
  | {
      transactionId: string;
      date: IsoDate;
      reason: 'no_position';
    };

export function averagePrice(holding: Holding): number {
  return holding.quantity > QUANTITY_EPSILON ? holding.costBasis / holding.quantity : 0;
}

/**
 * Хронологический порядок. Сортировка стабильна: сделки одного дня
 * применяются в порядке их следования в исходном массиве.
 */
export function sortLedger(transactions: readonly Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function createLedgerState(): LedgerState {
  return {
    cash: 0,
    holdings: new Map(),
    totals: { deposits: 0, withdrawals: 0, dividends: 0, fees: 0, realizedPnl: 0 },
  };
}

function holdingFor(state: LedgerState, ticker: string): Holding {
  let holding = state.holdings.get(ticker);
  if (!holding) {
    holding = { ticker, quantity: 0, costBasis: 0, realizedPnl: 0, dividends: 0 };
    state.holdings.set(ticker, holding);
  }
  return holding;
}

function shortage(
  tx: Transaction,
  reason: 'insufficient_cash' | 'insufficient_quantity',
  required: number,
  available: number,
): LedgerViolation {
  return { transactionId: tx.id, date: tx.date, reason, required, available };
}

/**
 * Применяет сделку к состоянию **на месте** (state принадлежит вызывающему коду).
 * Некорректная сделка не применяется — возвращается нарушение, состояние не меняется.
 */
export function applyTransaction(state: LedgerState, tx: Transaction): LedgerViolation | null {
  switch (tx.type) {
    case 'deposit': {
      state.cash += tx.amount;
      state.totals.deposits += tx.amount;
      return null;
    }
    case 'withdrawal': {
      if (tx.amount > state.cash + MONEY_EPSILON) {
        return shortage(tx, 'insufficient_cash', tx.amount, state.cash);
      }
      state.cash -= tx.amount;
      state.totals.withdrawals += tx.amount;
      return null;
    }
    case 'buy': {
      const cost = tx.quantity * tx.price + tx.fee;
      if (cost > state.cash + MONEY_EPSILON) {
        return shortage(tx, 'insufficient_cash', cost, state.cash);
      }
      const holding = holdingFor(state, tx.ticker);
      holding.quantity += tx.quantity;
      holding.costBasis += cost;
      state.cash -= cost;
      state.totals.fees += tx.fee;
      return null;
    }
    case 'sell': {
      const available = state.holdings.get(tx.ticker)?.quantity ?? 0;
      if (tx.quantity > available + QUANTITY_EPSILON) {
        return shortage(tx, 'insufficient_quantity', tx.quantity, available);
      }
      const proceeds = tx.quantity * tx.price - tx.fee;
      // Комиссия больше выручки может увести кэш в минус.
      if (state.cash + proceeds < -MONEY_EPSILON) {
        return shortage(tx, 'insufficient_cash', -proceeds, state.cash);
      }
      const holding = holdingFor(state, tx.ticker);
      const avg = averagePrice(holding);
      const realized = (tx.price - avg) * tx.quantity - tx.fee;
      holding.quantity -= tx.quantity;
      holding.costBasis -= avg * tx.quantity;
      if (holding.quantity <= QUANTITY_EPSILON) {
        holding.quantity = 0;
        holding.costBasis = 0;
      }
      holding.realizedPnl += realized;
      state.cash += proceeds;
      state.totals.fees += tx.fee;
      state.totals.realizedPnl += realized;
      return null;
    }
    case 'dividend': {
      const holding = state.holdings.get(tx.ticker);
      if (!holding || holding.quantity <= QUANTITY_EPSILON) {
        return { transactionId: tx.id, date: tx.date, reason: 'no_position' };
      }
      holding.dividends += tx.amount;
      state.cash += tx.amount;
      state.totals.dividends += tx.amount;
      return null;
    }
  }
}

export interface ReplayResult {
  state: LedgerState;
  violations: LedgerViolation[];
}

export interface ReplayOptions {
  /** Применить только сделки с датой ≤ `until` (состояние на конец дня). */
  until?: IsoDate;
}

/** Прогоняет все сделки в хронологическом порядке. Чистая функция. */
export function replayLedger(
  transactions: readonly Transaction[],
  options: ReplayOptions = {},
): ReplayResult {
  const state = createLedgerState();
  const violations: LedgerViolation[] = [];
  for (const tx of sortLedger(transactions)) {
    if (options.until !== undefined && tx.date > options.until) break;
    const violation = applyTransaction(state, tx);
    if (violation) violations.push(violation);
  }
  return { state, violations };
}

/** Первое нарушение в леджере или `null`, если леджер корректен. */
export function validateLedger(transactions: readonly Transaction[]): LedgerViolation | null {
  return replayLedger(transactions).violations[0] ?? null;
}

/** Открытые позиции (ненулевое количество). */
export function openHoldings(state: LedgerState): Holding[] {
  return [...state.holdings.values()].filter((h) => h.quantity > QUANTITY_EPSILON);
}

/** Влияние сделки на кэш, USD, со знаком: пополнение +, покупка −. */
export function cashEffect(tx: Transaction): number {
  switch (tx.type) {
    case 'deposit':
    case 'dividend':
      return tx.amount;
    case 'withdrawal':
      return -tx.amount;
    case 'buy':
      return -(tx.quantity * tx.price + tx.fee);
    case 'sell':
      return tx.quantity * tx.price - tx.fee;
  }
}
