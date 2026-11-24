import type { z } from 'zod';
import {
  isValidationCode,
  transactionInputSchema,
  type IsoDate,
  type Transaction,
  type TransactionInput,
  type ValidationCode,
} from '@/shared/model';
import { type LedgerViolation, replayLedger } from './ledger';
import { hasPrecision } from './math';

/**
 * Валидация сделки: одна функция для клиента и для обработчика MSW.
 * 1) форма данных (Zod), 2) правила домена (дата, точность, известный актив),
 * 3) целостность леджера: сделка не должна сломать ни себя, ни любую более позднюю сделку.
 */

export type TransactionField =
  'type' | 'date' | 'ticker' | 'quantity' | 'price' | 'fee' | 'amount' | 'note';

export interface FieldError {
  code: ValidationCode;
  /** Параметры для текста ошибки, например доступное количество. */
  params?: Record<string, number | string>;
}

export type FieldErrors = Partial<Record<TransactionField, FieldError>>;

/** Изменение ломает другую сделку (обычно более позднюю). */
export interface LedgerConflict {
  transactionId: string;
  date: IsoDate;
  reason: LedgerViolation['reason'];
}

export type TransactionValidationResult =
  | { ok: true; value: TransactionInput }
  | { ok: false; fieldErrors: FieldErrors; conflict?: LedgerConflict };

export interface AssetConstraints {
  quantityPrecision: number;
  /** Первая дата истории цен актива. */
  historyStart: IsoDate;
}

export interface ValidationContext {
  today: IsoDate;
  assets: ReadonlyMap<string, AssetConstraints>;
  /** Текущий леджер. */
  transactions: readonly Transaction[];
  /** id изменяемой сделки; без него сделка создаётся. */
  editingId?: string;
}

const FIELDS: readonly TransactionField[] = [
  'type',
  'date',
  'ticker',
  'quantity',
  'price',
  'fee',
  'amount',
  'note',
];

function isField(value: unknown): value is TransactionField {
  return FIELDS.some((field) => field === value);
}

function zodFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    const key: TransactionField = isField(field) ? field : 'type';
    errors[key] ??= { code: isValidationCode(issue.message) ? issue.message : 'invalid' };
  }
  return errors;
}

function domainFieldErrors(input: TransactionInput, ctx: ValidationContext): FieldErrors {
  const errors: FieldErrors = {};
  if (input.date > ctx.today) errors.date = { code: 'date_in_future' };
  if (input.ticker === null) return errors;

  const asset = ctx.assets.get(input.ticker);
  if (!asset) {
    errors.ticker = { code: 'unknown_asset' };
    return errors;
  }
  if (input.date < asset.historyStart) {
    errors.date = { code: 'date_before_history', params: { date: asset.historyStart } };
  }
  if (input.quantity !== null && !hasPrecision(input.quantity, asset.quantityPrecision)) {
    errors.quantity = {
      code: 'too_many_decimals',
      params: { precision: asset.quantityPrecision },
    };
  }
  return errors;
}

/** Ошибка у поля, если леджер сломала сама проверяемая сделка. */
function ownViolationError(
  input: TransactionInput,
  violation: LedgerViolation,
): [TransactionField, FieldError] {
  if (violation.reason === 'no_position') return ['ticker', { code: 'no_position' }];
  const params = { available: violation.available };
  if (violation.reason === 'insufficient_quantity') {
    return ['quantity', { code: 'insufficient_quantity', params }];
  }
  return [
    input.type === 'withdrawal' ? 'amount' : 'quantity',
    { code: 'insufficient_cash', params },
  ];
}

function toConflict(violation: LedgerViolation): LedgerConflict {
  return { transactionId: violation.transactionId, date: violation.date, reason: violation.reason };
}

const DRAFT_ID = '__draft__';

export function validateTransaction(
  raw: unknown,
  ctx: ValidationContext,
): TransactionValidationResult {
  const parsed = transactionInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const input: TransactionInput = parsed.data;

  const fieldErrors = domainFieldErrors(input, ctx);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const id = ctx.editingId ?? DRAFT_ID;
  const candidate: Transaction = { ...input, id };
  const next =
    ctx.editingId === undefined
      ? [...ctx.transactions, candidate]
      : ctx.transactions.map((tx) => (tx.id === id ? candidate : tx));

  const violation = replayLedger(next).violations[0];
  if (!violation) return { ok: true, value: input };
  if (violation.transactionId === id) {
    const [field, error] = ownViolationError(input, violation);
    return { ok: false, fieldErrors: { [field]: error } };
  }
  return { ok: false, fieldErrors: {}, conflict: toConflict(violation) };
}

/** Можно ли удалить сделку: `null`, если леджер останется корректным. */
export function validateDeletion(
  id: string,
  transactions: readonly Transaction[],
): LedgerConflict | null {
  const violation = replayLedger(transactions.filter((tx) => tx.id !== id)).violations[0];
  return violation ? toConflict(violation) : null;
}
