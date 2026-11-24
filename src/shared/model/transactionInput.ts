import { z } from 'zod';
import type { Transaction } from './types';

/**
 * Коды ошибок валидации. Это не тексты, а ключи: UI переводит их через i18n,
 * поэтому «сервер» (MSW) и клиент отдают одинаковые ошибки на любом языке.
 */
export const VALIDATION_CODES = [
  'required',
  'invalid',
  'too_long',
  'unknown_asset',
  'date_in_future',
  'date_before_history',
  'must_be_positive',
  'must_be_non_negative',
  'too_many_decimals',
  'insufficient_cash',
  'insufficient_quantity',
  'no_position',
] as const;
export type ValidationCode = (typeof VALIDATION_CODES)[number];

export function isValidationCode(value: string): value is ValidationCode {
  return VALIDATION_CODES.some((code) => code === value);
}

export const NOTE_MAX_LENGTH = 200;

const isoDate = z
  .string({ error: 'required' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'invalid');
const ticker = z.string({ error: 'required' }).trim().min(1, 'required');
const positive = z.number({ error: 'required' }).positive('must_be_positive');
const note = z.string().max(NOTE_MAX_LENGTH, 'too_long').optional();

const tradeSchema = z.object({
  type: z.enum(['buy', 'sell']),
  date: isoDate,
  ticker,
  quantity: positive,
  price: positive,
  amount: z.null(),
  fee: z.number({ error: 'required' }).min(0, 'must_be_non_negative'),
  note,
});

const dividendSchema = z.object({
  type: z.literal('dividend'),
  date: isoDate,
  ticker,
  quantity: z.null(),
  price: z.null(),
  amount: positive,
  fee: z.literal(0),
  note,
});

const cashSchema = z.object({
  type: z.enum(['deposit', 'withdrawal']),
  date: isoDate,
  ticker: z.null(),
  quantity: z.null(),
  price: z.null(),
  amount: positive,
  fee: z.literal(0),
  note,
});

/** Схема тела POST/PUT `/api/transactions`: сделка без `id`. */
export const transactionInputSchema = z.discriminatedUnion('type', [
  tradeSchema,
  dividendSchema,
  cashSchema,
]);

/** Сделка с `id` — для чтения сохранённого слоя из `localStorage`. */
export const transactionSchema = z.discriminatedUnion('type', [
  tradeSchema.extend({ id: z.string().min(1) }),
  dividendSchema.extend({ id: z.string().min(1) }),
  cashSchema.extend({ id: z.string().min(1) }),
]);

/** Omit, применённый к каждому варианту объединения по отдельности. */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Сделка без `id`: тело запроса на создание и изменение. */
export type TransactionInput = DistributiveOmit<Transaction, 'id'>;

// Проверка на этапе компиляции: схема и доменный тип не расходятся.
type Assert<T extends true> = T;
export type SchemaMatchesDomain = Assert<
  z.infer<typeof transactionInputSchema> extends TransactionInput ? true : false
>;
