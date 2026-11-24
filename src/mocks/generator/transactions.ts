import type { Candle, IsoDate, Transaction } from '@/shared/model';
import { monthOf } from '@/shared/lib/date';
import {
  applyTransaction,
  createLedgerState,
  floorToPrecision,
  openHoldings,
  roundTo,
  type LedgerState,
} from '@/shared/lib/finance';
import type { AssetSpec } from './assets';
import type { Random } from './random';

const INITIAL_DEPOSIT = 60_000;
/** Начальная раскладка: доля начального пополнения на каждый актив. */
const INITIAL_ALLOCATION: readonly [string, number][] = [
  ['VOO', 0.2],
  ['QQQ', 0.1],
  ['AAPL', 0.08],
  ['MSFT', 0.08],
  ['NVDA', 0.05],
  ['JNJ', 0.05],
  ['JPM', 0.05],
  ['KO', 0.04],
  ['BND', 0.1],
  ['BTC', 0.05],
  ['ETH', 0.03],
];
/** Что докупается ежемесячно; повторы задают вероятности (ETF чаще). Порядок важен для seed. */
// prettier-ignore
const MONTHLY_BUY_UNIVERSE = [
  'VOO', 'VOO', 'VOO', 'QQQ', 'QQQ', 'SCHD', 'SCHD', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL',
  'JNJ', 'XOM', 'JPM', 'KO', 'V', 'PG', 'VNQ', 'BND', 'BND', 'TLT', 'BTC', 'ETH', 'SOL',
] as const;
const MIN_DIVIDEND_YIELD = 0.025;
const STOCK_FEE = 1;
const CRYPTO_FEE_RATE = 0.001;
/** Дивиденды раз в полгода — чтобы выплаты не заполонили историю сделок. */
const DIVIDEND_MONTHS = new Set(['06', '12']);
const PAYOUTS_PER_YEAR = 2;
const WITHDRAWAL_MONTH = 20;

/** Omit, применённый к каждому варианту объединения по отдельности. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** Сделка без id. */
type Draft = DistributiveOmit<Transaction, 'id'>;

interface Context {
  rng: Random;
  specs: ReadonlyMap<string, AssetSpec>;
  candles: Readonly<Record<string, readonly Candle[]>>;
  state: LedgerState;
  drafts: Draft[];
}

function spec(ctx: Context, ticker: string): AssetSpec {
  const found = ctx.specs.get(ticker);
  if (!found) throw new Error(`Unknown ticker ${ticker}`);
  return found;
}

function closeAt(ctx: Context, ticker: string, day: number): number {
  const close = ctx.candles[ticker]?.[day]?.close;
  if (close === undefined) throw new Error(`No close for ${ticker} on day ${String(day)}`);
  return close;
}

/** Применяет сделку к состоянию; некорректная сделка — ошибка генератора. */
function emit(ctx: Context, draft: Draft): void {
  const violation = applyTransaction(ctx.state, { ...draft, id: 'draft' });
  if (violation) {
    throw new Error(
      `Generator produced an invalid ledger: ${JSON.stringify({ draft, violation })}`,
    );
  }
  ctx.drafts.push(draft);
}

function buy(ctx: Context, date: IsoDate, day: number, ticker: string, budget: number): void {
  const asset = spec(ctx, ticker);
  const price = closeAt(ctx, ticker, day);
  const isCrypto = asset.class === 'crypto';
  const notional = isCrypto ? budget / (1 + CRYPTO_FEE_RATE) : budget - STOCK_FEE;
  const quantity = floorToPrecision(notional / price, asset.quantityPrecision);
  if (quantity <= 0) return;
  const fee = isCrypto ? roundTo(quantity * price * CRYPTO_FEE_RATE, 2) : STOCK_FEE;
  emit(ctx, { date, type: 'buy', ticker, quantity, price, amount: null, fee });
}

function sell(ctx: Context, date: IsoDate, day: number): void {
  const candidates = openHoldings(ctx.state).filter((h) => spec(ctx, h.ticker).class !== 'bond');
  if (candidates.length === 0) return;
  const holding = ctx.rng.pick(candidates);
  const asset = spec(ctx, holding.ticker);
  const quantity = floorToPrecision(
    holding.quantity * ctx.rng.between(0.25, 0.5),
    asset.quantityPrecision,
  );
  if (quantity <= 0) return;
  const price = closeAt(ctx, holding.ticker, day);
  const fee = asset.class === 'crypto' ? roundTo(quantity * price * CRYPTO_FEE_RATE, 2) : STOCK_FEE;
  emit(ctx, { date, type: 'sell', ticker: holding.ticker, quantity, price, amount: null, fee });
}

function payDividends(ctx: Context, date: IsoDate, day: number): void {
  for (const holding of openHoldings(ctx.state)) {
    const asset = spec(ctx, holding.ticker);
    if (asset.dividendYield < MIN_DIVIDEND_YIELD) continue;
    const amount = roundTo(
      (holding.quantity * closeAt(ctx, holding.ticker, day) * asset.dividendYield) /
        PAYOUTS_PER_YEAR,
      2,
    );
    if (amount <= 0) continue;
    emit(ctx, {
      date,
      type: 'dividend',
      ticker: holding.ticker,
      quantity: null,
      price: null,
      amount,
      fee: 0,
    });
  }
}

function cashTx(type: 'deposit' | 'withdrawal', date: IsoDate, amount: number): Draft {
  return { date, type, ticker: null, quantity: null, price: null, amount, fee: 0 };
}

/**
 * История сделок «типичного инвестора»: крупное начальное пополнение и раскладка,
 * ежемесячные пополнения с докупками, редкие частичные продажи, поквартальные дивиденды,
 * один вывод. Даты — по индексам торговых дней, поэтому сценарий одинаков при любом `today`.
 */
export function generateTransactions(
  dates: readonly IsoDate[],
  specs: readonly AssetSpec[],
  candles: Readonly<Record<string, readonly Candle[]>>,
  rng: Random,
): Transaction[] {
  const ctx: Context = {
    rng,
    specs: new Map(specs.map((s) => [s.ticker, s])),
    candles,
    state: createLedgerState(),
    drafts: [],
  };

  let monthIndex = 0;
  let dayInMonth = 0;
  let previousMonth = '';

  dates.forEach((date, day) => {
    const month = monthOf(date);
    if (month !== previousMonth) {
      monthIndex += day === 0 ? 0 : 1;
      dayInMonth = 0;
      previousMonth = month;
    }
    dayInMonth += 1;

    if (day === 0) {
      emit(ctx, cashTx('deposit', date, INITIAL_DEPOSIT));
      for (const [ticker, share] of INITIAL_ALLOCATION)
        buy(ctx, date, day, ticker, INITIAL_DEPOSIT * share);
      return;
    }

    const isWithdrawalMonth = monthIndex === WITHDRAWAL_MONTH;

    if (dayInMonth === 1) {
      emit(ctx, cashTx('deposit', date, roundTo(rng.between(1_500, 3_500), -2)));
      // В месяц вывода не докупаем: деньги копятся под вывод.
      const count = isWithdrawalMonth ? 0 : rng.chance(0.3) ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const budget = ctx.state.cash * (count === 2 ? 0.45 : 0.85);
        buy(ctx, date, day, rng.pick(MONTHLY_BUY_UNIVERSE), budget);
      }
    }

    if (monthIndex % 4 === 2 && dayInMonth === 10) sell(ctx, date, day);

    if (isWithdrawalMonth && dayInMonth === 5) {
      const amount = roundTo(Math.min(3_000, ctx.state.cash * 0.8), -2);
      if (amount > 0) emit(ctx, cashTx('withdrawal', date, amount));
    }

    if (DIVIDEND_MONTHS.has(month.slice(5)) && dayInMonth === 15) payDividends(ctx, date, day);
  });

  return ctx.drafts.map((draft, i) => ({ ...draft, id: `demo-${String(i + 1).padStart(4, '0')}` }));
}
