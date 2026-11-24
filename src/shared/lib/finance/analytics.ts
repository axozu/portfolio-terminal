import type { IsoDate, IsoMonth, Transaction } from '@/shared/model';
import { monthOf } from '../date';
import { RISK_FREE_RATE, TRADING_DAYS_PER_YEAR } from './constants';
import type { ValuePoint } from './history';
import { mean, sampleStdDev } from './math';

export interface DatedValue {
  date: IsoDate;
  value: number;
}

/**
 * Дневные доходности за вычетом потоков: r_t = (V_t − F_t) / V_{t−1} − 1,
 * где F_t — пополнения минус выводы за день (считаем, что приходят в конце дня).
 * Так пополнение не выглядит как «рост портфеля». Дни с V_{t−1} ≤ 0 пропускаются.
 */
export function dailyReturns(history: readonly ValuePoint[]): DatedValue[] {
  const returns: DatedValue[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    if (!prev || !curr || prev.value <= 0) continue;
    returns.push({ date: curr.date, value: (curr.value - curr.netFlow) / prev.value - 1 });
  }
  return returns;
}

export interface MonthlyReturn {
  month: IsoMonth;
  /** Сцепленная доходность дней месяца: Π(1 + r_t) − 1. */
  return: number;
  /** Изменение стоимости за месяц за вычетом пополнений и выводов, USD. */
  pnl: number;
}

export function monthlyReturns(history: readonly ValuePoint[]): MonthlyReturn[] {
  const byMonth = new Map<IsoMonth, MonthlyReturn>();
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    if (!prev || !curr) continue;
    const month = monthOf(curr.date);
    const entry = byMonth.get(month) ?? { month, return: 0, pnl: 0 };
    entry.pnl += curr.value - curr.netFlow - prev.value;
    if (prev.value > 0) {
      const r = (curr.value - curr.netFlow) / prev.value - 1;
      entry.return = (1 + entry.return) * (1 + r) - 1;
    }
    byMonth.set(month, entry);
  }
  return [...byMonth.values()];
}

/**
 * Просадка индекса благосостояния W_t = Π(1 + r): W_t / max(W_0..W_t) − 1.
 * Считается по доходностям, а не по сырой стоимости, чтобы пополнения не «лечили» просадку.
 * Значения ≤ 0; первая точка истории — 0.
 */
export function drawdownSeries(history: readonly ValuePoint[]): DatedValue[] {
  const first = history[0];
  if (!first) return [];
  const series: DatedValue[] = [{ date: first.date, value: 0 }];
  let wealth = 1;
  let peak = 1;
  for (const { date, value } of dailyReturns(history)) {
    wealth *= 1 + value;
    peak = Math.max(peak, wealth);
    series.push({ date, value: wealth / peak - 1 });
  }
  return series;
}

/** Максимальная просадка (отрицательное число или 0). */
export function maxDrawdown(history: readonly ValuePoint[]): number {
  return drawdownSeries(history).reduce((min, p) => Math.min(min, p.value), 0);
}

/** Годовая волатильность: σ дневных доходностей × √252. */
export function annualizedVolatility(returns: readonly DatedValue[]): number | null {
  const sigma = sampleStdDev(returns.map((r) => r.value));
  return sigma === null ? null : sigma * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/**
 * Коэффициент Шарпа: (средняя дневная доходность × 252 − безрисковая ставка) / годовая волатильность.
 * `null`, если данных мало или волатильность нулевая.
 */
export function sharpeRatio(
  returns: readonly DatedValue[],
  riskFreeRate: number = RISK_FREE_RATE,
): number | null {
  const avg = mean(returns.map((r) => r.value));
  const volatility = annualizedVolatility(returns);
  if (avg === null || volatility === null || volatility === 0) return null;
  return (avg * TRADING_DAYS_PER_YEAR - riskFreeRate) / volatility;
}

export interface MonthlyAmount {
  month: IsoMonth;
  amount: number;
}

function nextMonth(month: IsoMonth): IsoMonth {
  const [year = 0, mon = 1] = month.split('-').map(Number);
  const y = mon === 12 ? year + 1 : year;
  const m = mon === 12 ? 1 : mon + 1;
  return `${String(y)}-${String(m).padStart(2, '0')}`;
}

/** Все месяцы от `from` до `to` включительно. */
export function monthsBetween(from: IsoMonth, to: IsoMonth): IsoMonth[] {
  const months: IsoMonth[] = [];
  for (let m = from; m <= to; m = nextMonth(m)) months.push(m);
  return months;
}

/** Дивиденды по месяцам; месяцы без выплат внутри периода заполняются нулями. */
export function dividendsByMonth(transactions: readonly Transaction[]): MonthlyAmount[] {
  const totals = new Map<IsoMonth, number>();
  for (const tx of transactions) {
    if (tx.type !== 'dividend') continue;
    const month = monthOf(tx.date);
    totals.set(month, (totals.get(month) ?? 0) + tx.amount);
  }
  const months = [...totals.keys()].sort();
  const first = months[0];
  const last = months.at(-1);
  if (first === undefined || last === undefined) return [];
  return monthsBetween(first, last).map((month) => ({ month, amount: totals.get(month) ?? 0 }));
}
