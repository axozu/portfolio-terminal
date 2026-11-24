import type { AssetClass } from '@/shared/model';
import type { PriceTick } from '@/shared/store/livePrices';

/** Дневная «амплитуда» одного тика по классам: крипта ≫ акции ≫ облигации. */
export const TICK_VOLATILITY: Record<AssetClass, number> = {
  crypto: 0.004,
  stock: 0.0015,
  etf: 0.001,
  bond: 0.0004,
};

export interface FeedAsset {
  ticker: string;
  price: number;
  class: AssetClass;
}

export interface PriceFeedOptions {
  /** Интервал между тиками, мс. */
  interval?: { min: number; max: number };
  /** Доля подписанных активов, получающих тик за раз. */
  share?: { min: number; max: number };
  random?: () => number;
  schedule?: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancel?: (handle: ReturnType<typeof setTimeout>) => void;
}

export type Unsubscribe = () => void;

export interface PriceFeed {
  /** Подписка в стиле WebSocket: тики приходят в `onTick`, вызов результата отписывает. */
  subscribe: (tickers: readonly string[], onTick: (ticks: PriceTick[]) => void) => Unsubscribe;
}

/** Нормальное случайное число (Бокс — Мюллер). */
function normal(random: () => number): number {
  let u = 0;
  while (u === 0) u = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

/** Следующая цена: небольшое лог-нормальное изменение от последней, с округлением до центов. */
export function nextPrice(last: number, volatility: number, z: number): number {
  const decimals = last < 10 ? 4 : 2;
  const factor = 10 ** decimals;
  return Math.round(last * Math.exp(volatility * z) * factor) / factor;
}

/** Случайная часть массива (без повторов), размером от `min` до `max` доли. */
export function pickShare<T>(items: readonly T[], share: number, random: () => number): T[] {
  const count = Math.max(1, Math.round(items.length * share));
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    const [item] = pool.splice(index, 1);
    if (item !== undefined) picked.push(item);
  }
  return picked;
}

/**
 * Имитация потока котировок. Каждые 2–4 секунды случайная часть подписанных активов
 * получает тик от своей последней цены. Внешних запросов нет — демо не зависит от сети.
 */
export function createPriceFeed(
  assets: readonly FeedAsset[],
  options: PriceFeedOptions = {},
): PriceFeed {
  const {
    interval = { min: 2_000, max: 4_000 },
    share = { min: 0.2, max: 0.45 },
    random = Math.random,
    schedule = (callback: () => void, ms: number) => setTimeout(callback, ms),
    cancel = (handle: ReturnType<typeof setTimeout>) => {
      clearTimeout(handle);
    },
  } = options;
  const last = new Map(assets.map((a) => [a.ticker, a.price]));
  const classOf = new Map(assets.map((a) => [a.ticker, a.class]));

  return {
    subscribe(tickers, onTick) {
      const known = tickers.filter((t) => last.has(t));
      let handle: ReturnType<typeof setTimeout> | undefined;
      let active = true;

      const tick = () => {
        if (!active) return;
        const chosen = pickShare(known, share.min + (share.max - share.min) * random(), random);
        const ticks = chosen.map((ticker) => {
          const volatility = TICK_VOLATILITY[classOf.get(ticker) ?? 'stock'];
          const price = nextPrice(last.get(ticker) ?? 0, volatility, normal(random));
          last.set(ticker, price);
          return { ticker, price };
        });
        if (ticks.length > 0) onTick(ticks);
        loop();
      };
      const loop = () => {
        handle = schedule(tick, interval.min + (interval.max - interval.min) * random());
      };

      if (known.length > 0) loop();
      return () => {
        active = false;
        if (handle !== undefined) cancel(handle);
      };
    },
  };
}
