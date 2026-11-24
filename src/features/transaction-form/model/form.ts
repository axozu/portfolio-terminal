import type { AssetListItem } from '@/shared/api';
import { cashEffect } from '@/shared/lib/finance';
import type { Candle, IsoDate, Transaction, TransactionType } from '@/shared/model';
import type { TransactionFormPrefill } from '@/shared/store/ui';

/** Значения формы — строки, как в полях ввода; в числа превращаются при отправке. */
export interface TransactionFormValues {
  type: TransactionType;
  ticker: string;
  date: IsoDate;
  quantity: string;
  price: string;
  fee: string;
  amount: string;
  note: string;
}

export type FormField = Exclude<keyof TransactionFormValues, 'type'>;

/** Какие поля показываются для каждого типа сделки (раздел 10 ТЗ). */
export const FIELDS_BY_TYPE: Record<TransactionType, readonly FormField[]> = {
  buy: ['ticker', 'date', 'quantity', 'price', 'fee', 'note'],
  sell: ['ticker', 'date', 'quantity', 'price', 'fee', 'note'],
  dividend: ['ticker', 'date', 'amount', 'note'],
  deposit: ['date', 'amount', 'note'],
  withdrawal: ['date', 'amount', 'note'],
};

export function isTrade(type: TransactionType): type is 'buy' | 'sell' {
  return type === 'buy' || type === 'sell';
}

export function defaultFormValues(
  prefill: TransactionFormPrefill,
  today: IsoDate,
): TransactionFormValues {
  return {
    type: prefill.type ?? 'buy',
    ticker: prefill.ticker ?? '',
    date: today,
    quantity: '',
    price: '',
    fee: '0',
    amount: '',
    note: '',
  };
}

export function formValuesFromTransaction(tx: Transaction): TransactionFormValues {
  return {
    type: tx.type,
    ticker: tx.ticker ?? '',
    date: tx.date,
    quantity: tx.quantity === null ? '' : String(tx.quantity),
    price: tx.price === null ? '' : String(tx.price),
    fee: String(tx.fee),
    amount: tx.amount === null ? '' : String(tx.amount),
    note: tx.note ?? '',
  };
}

/** «1 234,5» → 1234.5; пустая строка → undefined (поле не заполнено), мусор → NaN. */
export function parseDecimal(value: string): number | undefined {
  const normalized = value.replace(/[\s ]/g, '').replace(',', '.');
  if (normalized === '') return undefined;
  return /^-?\d*\.?\d+$|^-?\d+\.$/.test(normalized) ? Number(normalized) : Number.NaN;
}

/**
 * Значения формы → тело запроса по схеме API. Поля, которых у типа нет, становятся `null`.
 * Результат не проверен — его проверяет `validateTransaction`.
 */
export function toTransactionInput(values: TransactionFormValues): Record<string, unknown> {
  const note = values.note.trim() === '' ? undefined : values.note.trim();
  if (isTrade(values.type)) {
    return {
      type: values.type,
      date: values.date,
      ticker: values.ticker,
      quantity: parseDecimal(values.quantity),
      price: parseDecimal(values.price),
      amount: null,
      fee: parseDecimal(values.fee) ?? 0,
      note,
    };
  }
  return {
    type: values.type,
    date: values.date,
    ticker: values.type === 'dividend' ? values.ticker : null,
    quantity: null,
    price: null,
    amount: parseDecimal(values.amount),
    fee: 0,
    note,
  };
}

/** Цена закрытия на дату или на ближайший торговый день до неё. */
export function closeOnOrBefore(candles: readonly Candle[], date: IsoDate): number | undefined {
  let close: number | undefined;
  for (const candle of candles) {
    if (candle.date > date) break;
    close = candle.close;
  }
  return close;
}

/** Изменение позиции в активе от сделки: покупка +, продажа −, остальное 0. */
function signedQuantity(tx: Transaction | undefined, ticker: string): number {
  if (tx?.ticker !== ticker) return 0;
  if (tx.type === 'buy') return tx.quantity;
  if (tx.type === 'sell') return -tx.quantity;
  return 0;
}

export interface PreviewState {
  cash: number;
  /** Количество актива в портфеле сейчас (0, если позиции нет). */
  positionQuantity: number;
}

export interface TransactionPreview {
  /** Влияние сделки на кэш со знаком; `null`, пока введённых данных недостаточно. */
  total: number | null;
  cashAfter: number | null;
  positionAfter: number | null;
}

/**
 * Предпросмотр «после сделки» от текущего состояния портфеля. Для изменения сделки
 * сначала вычитается эффект исходной версии, чтобы не учесть её дважды.
 */
export function computePreview(
  values: TransactionFormValues,
  state: PreviewState,
  original?: Transaction,
): TransactionPreview {
  const input = toTransactionInput(values);
  const quantity = typeof input.quantity === 'number' ? input.quantity : Number.NaN;
  const price = typeof input.price === 'number' ? input.price : Number.NaN;
  const amount = typeof input.amount === 'number' ? input.amount : Number.NaN;
  const fee = typeof input.fee === 'number' ? input.fee : 0;

  let total: number;
  if (isTrade(values.type)) {
    const gross = quantity * price;
    total = values.type === 'buy' ? -(gross + fee) : gross - fee;
  } else {
    total = values.type === 'withdrawal' ? -amount : amount;
  }
  if (!Number.isFinite(total)) return { total: null, cashAfter: null, positionAfter: null };

  const originalEffect = original ? cashEffect(original) : 0;
  const originalQty = signedQuantity(original, values.ticker);
  const delta = values.type === 'buy' ? quantity : values.type === 'sell' ? -quantity : 0;

  return {
    total,
    cashAfter: state.cash - originalEffect + total,
    positionAfter: isTrade(values.type) ? state.positionQuantity - originalQty + delta : null,
  };
}

/** Ограничения по активам для клиентской валидации (точность количества, начало истории). */
export function constraintsFromAssets(assets: readonly AssetListItem[]) {
  return new Map(
    assets.map((a) => [
      a.ticker,
      { quantityPrecision: a.quantityPrecision, historyStart: a.historyStart },
    ]),
  );
}
