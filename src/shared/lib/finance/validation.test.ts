import { describe, expect, it } from 'vitest';
import type { TransactionInput } from '@/shared/model';
import { createTxFactory } from '@/test/fixtures/transactions';
import { validateDeletion, validateTransaction, type ValidationContext } from './validation';

const tx = createTxFactory();
const deposit = tx.deposit('2024-01-02', 1_000);
const buy = tx.buy('2024-01-03', 'AAPL', 5, 100); // кэш 500
const sell = tx.sell('2024-02-01', 'AAPL', 3, 110); // кэш 830, позиция 2

const ctx: ValidationContext = {
  today: '2024-06-01',
  assets: new Map([
    ['AAPL', { quantityPrecision: 4, historyStart: '2023-01-02' }],
    ['BTC', { quantityPrecision: 8, historyStart: '2023-01-02' }],
  ]),
  transactions: [deposit, buy, sell],
};

const buyInput = (
  over: Partial<Extract<TransactionInput, { type: 'buy' | 'sell' }>> = {},
): TransactionInput => ({
  type: 'buy',
  date: '2024-03-01',
  ticker: 'AAPL',
  quantity: 1,
  price: 100,
  amount: null,
  fee: 0,
  ...over,
});

describe('validateTransaction: shape', () => {
  it('accepts a valid buy', () => {
    expect(validateTransaction(buyInput(), ctx)).toEqual({ ok: true, value: buyInput() });
  });

  it('reports field codes for invalid values', () => {
    const result = validateTransaction(
      { ...buyInput(), quantity: -1, price: 0, fee: -2, date: '2024-13-45' },
      ctx,
    );
    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        quantity: { code: 'must_be_positive' },
        price: { code: 'must_be_positive' },
        fee: { code: 'must_be_non_negative' },
        date: { code: 'invalid' },
      },
    });
  });

  it('requires type-specific fields', () => {
    const result = validateTransaction(
      { type: 'deposit', date: '2024-03-01', ticker: null, quantity: null, price: null, fee: 0 },
      ctx,
    );
    expect(result).toMatchObject({ ok: false, fieldErrors: { amount: { code: 'required' } } });
  });

  it('rejects an unknown type and garbage', () => {
    expect(validateTransaction({ type: 'short' }, ctx)).toMatchObject({
      ok: false,
      fieldErrors: { type: { code: 'invalid' } },
    });
    expect(validateTransaction(42, ctx)).toMatchObject({ ok: false });
  });

  it('limits the note length', () => {
    expect(validateTransaction(buyInput({ note: 'x'.repeat(201) }), ctx)).toMatchObject({
      fieldErrors: { note: { code: 'too_long' } },
    });
  });
});

describe('validateTransaction: domain rules', () => {
  it('rejects a future date', () => {
    expect(validateTransaction(buyInput({ date: '2024-06-02' }), ctx)).toMatchObject({
      fieldErrors: { date: { code: 'date_in_future' } },
    });
  });

  it('rejects a date before the asset price history', () => {
    expect(validateTransaction(buyInput({ date: '2022-12-30' }), ctx)).toMatchObject({
      fieldErrors: { date: { code: 'date_before_history', params: { date: '2023-01-02' } } },
    });
  });

  it('rejects an unknown asset', () => {
    expect(validateTransaction(buyInput({ ticker: 'NOPE' }), ctx)).toMatchObject({
      fieldErrors: { ticker: { code: 'unknown_asset' } },
    });
  });

  it('enforces quantity precision per asset', () => {
    expect(validateTransaction(buyInput({ quantity: 0.00001 }), ctx)).toMatchObject({
      fieldErrors: { quantity: { code: 'too_many_decimals', params: { precision: 4 } } },
    });
    expect(
      validateTransaction(buyInput({ ticker: 'BTC', quantity: 0.00001, price: 100 }), ctx),
    ).toMatchObject({
      ok: true,
    });
  });
});

describe('validateTransaction: ledger', () => {
  it('rejects a buy without enough cash on that date', () => {
    expect(validateTransaction(buyInput({ quantity: 9, price: 100 }), ctx)).toEqual({
      ok: false,
      fieldErrors: { quantity: { code: 'insufficient_cash', params: { available: 830 } } },
    });
  });

  it('checks cash at the transaction date, not today', () => {
    // 2024-01-04 кэш 500 (продажа ещё не случилась), а сейчас — 830.
    expect(validateTransaction(buyInput({ date: '2024-01-04', quantity: 6 }), ctx)).toMatchObject({
      fieldErrors: { quantity: { code: 'insufficient_cash', params: { available: 500 } } },
    });
  });

  it('rejects selling more than the position at that date', () => {
    expect(validateTransaction(buyInput({ type: 'sell', quantity: 3 }), ctx)).toEqual({
      ok: false,
      fieldErrors: { quantity: { code: 'insufficient_quantity', params: { available: 2 } } },
    });
  });

  it('rejects a withdrawal without enough cash on the amount field', () => {
    const input: TransactionInput = {
      type: 'withdrawal',
      date: '2024-03-01',
      ticker: null,
      quantity: null,
      price: null,
      amount: 1_000,
      fee: 0,
    };
    expect(validateTransaction(input, ctx)).toMatchObject({
      fieldErrors: { amount: { code: 'insufficient_cash' } },
    });
  });

  it('rejects a dividend without a position', () => {
    const input: TransactionInput = {
      type: 'dividend',
      date: '2024-01-02',
      ticker: 'AAPL',
      quantity: null,
      price: null,
      amount: 1,
      fee: 0,
    };
    expect(validateTransaction(input, ctx)).toMatchObject({
      fieldErrors: { ticker: { code: 'no_position' } },
    });
  });

  it('reports which later transaction a new one would break', () => {
    // Январская продажа 3 AAPL сама корректна, но после неё в феврале не хватит AAPL на продажу 3.
    const early = buyInput({ type: 'sell', date: '2024-01-10', quantity: 3 });
    expect(validateTransaction(early, ctx)).toEqual({
      ok: false,
      fieldErrors: {},
      conflict: { transactionId: sell.id, date: '2024-02-01', reason: 'insufficient_quantity' },
    });
  });

  it('validates an edit in place and detects a broken later sale', () => {
    // Уменьшаем покупку с 5 до 2 — февральская продажа 3 становится невозможной.
    const edited = buyInput({ date: '2024-01-03', quantity: 2 });
    expect(validateTransaction(edited, { ...ctx, editingId: buy.id })).toMatchObject({
      conflict: { transactionId: sell.id, reason: 'insufficient_quantity' },
    });
    // Увеличиваем до 10: на 2024-01-03 кэша 1000 хватает впритык.
    expect(
      validateTransaction(buyInput({ date: '2024-01-03', quantity: 10 }), {
        ...ctx,
        editingId: buy.id,
      }),
    ).toMatchObject({ ok: true });
  });
});

describe('validateDeletion', () => {
  it('allows deleting a transaction nothing depends on', () => {
    expect(validateDeletion(sell.id, ctx.transactions)).toBeNull();
  });

  it('rejects deleting a buy that a later sale depends on', () => {
    expect(validateDeletion(buy.id, ctx.transactions)).toEqual({
      transactionId: sell.id,
      date: '2024-02-01',
      reason: 'insufficient_quantity',
    });
  });

  it('rejects deleting the deposit that funds everything', () => {
    expect(validateDeletion(deposit.id, ctx.transactions)).toMatchObject({
      transactionId: buy.id,
      reason: 'insufficient_cash',
    });
  });
});
