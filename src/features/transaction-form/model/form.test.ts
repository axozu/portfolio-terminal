import { describe, expect, it } from 'vitest';
import { createTxFactory } from '@/test/fixtures/transactions';
import {
  closeOnOrBefore,
  computePreview,
  defaultFormValues,
  formValuesFromTransaction,
  parseDecimal,
  toTransactionInput,
  type TransactionFormValues,
} from './form';

const values = (over: Partial<TransactionFormValues>): TransactionFormValues => ({
  ...defaultFormValues({}, '2026-11-24'),
  ...over,
});

describe('parseDecimal', () => {
  it('accepts comma and spaces as typed in Russian locale', () => {
    expect(parseDecimal('1 234,5')).toBe(1234.5);
    expect(parseDecimal('0.00012')).toBe(0.00012);
    expect(parseDecimal('')).toBeUndefined();
    expect(parseDecimal('12abc')).toBeNaN();
  });
});

describe('toTransactionInput', () => {
  it('builds a trade with nulls for unused fields', () => {
    expect(
      toTransactionInput(
        values({ type: 'buy', ticker: 'AAPL', quantity: '2', price: '150,5', fee: '1' }),
      ),
    ).toEqual({
      type: 'buy',
      date: '2026-11-24',
      ticker: 'AAPL',
      quantity: 2,
      price: 150.5,
      amount: null,
      fee: 1,
      note: undefined,
    });
  });

  it('drops the ticker for cash transactions and keeps it for dividends', () => {
    expect(
      toTransactionInput(values({ type: 'deposit', ticker: 'AAPL', amount: '500' })),
    ).toMatchObject({
      ticker: null,
      amount: 500,
      quantity: null,
      fee: 0,
    });
    expect(
      toTransactionInput(values({ type: 'dividend', ticker: 'KO', amount: '3', note: ' Q4 ' })),
    ).toMatchObject({
      ticker: 'KO',
      note: 'Q4',
    });
  });

  it('round-trips an existing transaction', () => {
    const tx = createTxFactory().sell('2026-01-05', 'BTC', 0.5, 40_000, 2);
    // toEqual считает undefined-поля отсутствующими: id у тела запроса нет.
    expect(toTransactionInput(formValuesFromTransaction(tx))).toEqual({ ...tx, id: undefined });
  });
});

describe('closeOnOrBefore', () => {
  const candles = [
    { date: '2026-11-20', open: 1, high: 1, low: 1, close: 10, volume: 0 },
    { date: '2026-11-23', open: 1, high: 1, low: 1, close: 11, volume: 0 },
  ];

  it('uses the close of that day or the last trading day before it', () => {
    expect(closeOnOrBefore(candles, '2026-11-23')).toBe(11);
    expect(closeOnOrBefore(candles, '2026-11-22')).toBe(10); // воскресенье → пятница
    expect(closeOnOrBefore(candles, '2026-11-01')).toBeUndefined();
  });
});

describe('computePreview', () => {
  const state = { cash: 1_000, positionQuantity: 3 };

  it('shows the total, cash and position after a buy', () => {
    expect(
      computePreview(
        values({ type: 'buy', ticker: 'A', quantity: '2', price: '100', fee: '1' }),
        state,
      ),
    ).toEqual({
      total: -201,
      cashAfter: 799,
      positionAfter: 5,
    });
  });

  it('handles sells and cash transactions', () => {
    expect(
      computePreview(
        values({ type: 'sell', ticker: 'A', quantity: '1', price: '100', fee: '1' }),
        state,
      ),
    ).toEqual({
      total: 99,
      cashAfter: 1_099,
      positionAfter: 2,
    });
    expect(computePreview(values({ type: 'withdrawal', amount: '300' }), state)).toEqual({
      total: -300,
      cashAfter: 700,
      positionAfter: null,
    });
  });

  it('returns nulls while inputs are incomplete', () => {
    expect(computePreview(values({ type: 'buy', ticker: 'A', quantity: '2' }), state)).toEqual({
      total: null,
      cashAfter: null,
      positionAfter: null,
    });
  });

  it('replaces the original transaction when editing', () => {
    const original = createTxFactory().buy('2026-11-01', 'A', 2, 100, 0); // уже учтена в state
    expect(
      computePreview(
        values({ type: 'buy', ticker: 'A', quantity: '3', price: '100', fee: '0' }),
        state,
        original,
      ),
    ).toEqual({ total: -300, cashAfter: 900, positionAfter: 4 });
  });
});
