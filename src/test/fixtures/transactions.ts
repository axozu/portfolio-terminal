import type {
  CashTransaction,
  DividendTransaction,
  IsoDate,
  TradeTransaction,
} from '@/shared/model';

/** Фабрики сделок для тестов. id детерминированные: t1, t2, … в порядке создания. */
export function createTxFactory() {
  let counter = 0;
  const nextId = () => `t${String(++counter)}`;

  return {
    deposit: (date: IsoDate, amount: number): CashTransaction => ({
      id: nextId(),
      date,
      type: 'deposit',
      ticker: null,
      quantity: null,
      price: null,
      amount,
      fee: 0,
    }),
    withdrawal: (date: IsoDate, amount: number): CashTransaction => ({
      id: nextId(),
      date,
      type: 'withdrawal',
      ticker: null,
      quantity: null,
      price: null,
      amount,
      fee: 0,
    }),
    buy: (
      date: IsoDate,
      ticker: string,
      quantity: number,
      price: number,
      fee = 0,
    ): TradeTransaction => ({
      id: nextId(),
      date,
      type: 'buy',
      ticker,
      quantity,
      price,
      amount: null,
      fee,
    }),
    sell: (
      date: IsoDate,
      ticker: string,
      quantity: number,
      price: number,
      fee = 0,
    ): TradeTransaction => ({
      id: nextId(),
      date,
      type: 'sell',
      ticker,
      quantity,
      price,
      amount: null,
      fee,
    }),
    dividend: (date: IsoDate, ticker: string, amount: number): DividendTransaction => ({
      id: nextId(),
      date,
      type: 'dividend',
      ticker,
      quantity: null,
      price: null,
      amount,
      fee: 0,
    }),
  };
}

export type TxFactory = ReturnType<typeof createTxFactory>;
