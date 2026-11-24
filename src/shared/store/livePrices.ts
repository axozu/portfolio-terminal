import { create } from 'zustand';

export interface PriceTick {
  ticker: string;
  price: number;
}

interface LivePricesState {
  /** Текущие цены от live-фида. Пусто, пока фид не запущен, — тогда показываются цены API. */
  prices: Record<string, number>;
  /** Пользователь поставил фид на паузу. */
  paused: boolean;
  /** Вкладка скрыта — фид тоже стоит. */
  hidden: boolean;
  seed: (prices: Record<string, number>) => void;
  applyTicks: (ticks: readonly PriceTick[]) => void;
  togglePaused: () => void;
  setHidden: (hidden: boolean) => void;
}

/**
 * Live-цены в клиентском состоянии. Тики меняют только текущую цену;
 * история свечей и данные API остаются как есть.
 */
export const useLivePricesStore = create<LivePricesState>()((set) => ({
  prices: {},
  paused: false,
  hidden: false,
  seed: (prices) => {
    // Уже известные цены не перезаписываются: после перезапроса данных тики не «откатываются».
    set((state) => ({ prices: { ...prices, ...state.prices } }));
  },
  applyTicks: (ticks) => {
    set((state) => {
      const prices = { ...state.prices };
      for (const tick of ticks) prices[tick.ticker] = tick.price;
      return { prices };
    });
  },
  togglePaused: () => {
    set((state) => ({ paused: !state.paused }));
  },
  setHidden: (hidden) => {
    set({ hidden });
  },
}));

/** Цены как Map — удобный вход для чистых функций пересчёта. */
export function livePriceMap(prices: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(prices));
}
