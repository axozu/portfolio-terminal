import type { Candle, IsoDate, Transaction } from '@/shared/model';
import { applyTransaction, createLedgerState, sortLedger } from './ledger';

export interface ValuePoint {
  date: IsoDate;
  /** Кэш + Σ qty × close на эту дату. */
  value: number;
  cash: number;
  /** Пополнения − выводы, пришедшие в этот день (для доходности за вычетом потоков). */
  netFlow: number;
  /** Чистые вложения нарастающим итогом на конец дня. */
  netInvested: number;
}

function buildCloseIndex(
  candlesByTicker: Readonly<Record<string, readonly Candle[]>>,
): Map<string, Map<IsoDate, number>> {
  const index = new Map<string, Map<IsoDate, number>>();
  for (const [ticker, candles] of Object.entries(candlesByTicker)) {
    index.set(ticker, new Map(candles.map((c) => [c.date, c.close])));
  }
  return index;
}

/**
 * Дневная история стоимости портфеля: кэш на дату + Σ qty на дату × close на дату.
 *
 * - Сделки применяются на конец своего дня. Сделки раньше первой даты попадают в первую точку,
 *   сделки позже последней даты не учитываются.
 * - Если у актива нет свечи на дату (например, сделка в выходной), берётся последний известный close.
 * - Некорректные сделки пропускаются так же, как в `replayLedger`.
 */
export function computeValueHistory(
  transactions: readonly Transaction[],
  candlesByTicker: Readonly<Record<string, readonly Candle[]>>,
  dates: readonly IsoDate[],
): ValuePoint[] {
  const closes = buildCloseIndex(candlesByTicker);
  const lastClose = new Map<string, number>();
  const sorted = sortLedger(transactions);
  const state = createLedgerState();
  const points: ValuePoint[] = [];
  let cursor = 0;

  for (const date of dates) {
    let netFlow = 0;
    for (let tx = sorted[cursor]; tx && tx.date <= date; tx = sorted[++cursor]) {
      if (applyTransaction(state, tx) !== null) continue;
      if (tx.type === 'deposit') netFlow += tx.amount;
      if (tx.type === 'withdrawal') netFlow -= tx.amount;
    }

    for (const [ticker, byDate] of closes) {
      const close = byDate.get(date);
      if (close !== undefined) lastClose.set(ticker, close);
    }

    let positionsValue = 0;
    for (const holding of state.holdings.values()) {
      positionsValue += holding.quantity * (lastClose.get(holding.ticker) ?? 0);
    }

    points.push({
      date,
      value: state.cash + positionsValue,
      cash: state.cash,
      netFlow,
      netInvested: state.totals.deposits - state.totals.withdrawals,
    });
  }

  return points;
}

/**
 * Стоимость гипотетического портфеля, который получал бы те же деньги, но вкладывал их в бенчмарк.
 * В первой точке весь капитал V₀ «покупает» бенчмарк по B₀, затем каждый поток F_t
 * покупает (или продаёт) F_t / B_t единиц. Так сравнение честное: оба портфеля получают
 * одинаковые пополнения в одни и те же дни. Без цены бенчмарка на дату берётся последняя известная.
 */
export function benchmarkWithFlows(
  points: readonly ValuePoint[],
  benchmarkCloses: ReadonlyMap<IsoDate, number>,
): number[] {
  let units = 0;
  let lastClose: number | undefined;
  return points.map((point, i) => {
    lastClose = benchmarkCloses.get(point.date) ?? lastClose;
    if (lastClose === undefined || lastClose <= 0) return point.value;
    units += (i === 0 ? point.value : point.netFlow) / lastClose;
    return units * lastClose;
  });
}
