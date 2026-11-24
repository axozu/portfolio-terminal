import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPriceFeed, nextPrice, pickShare } from './priceFeed';

/** Детерминированная последовательность «случайных» чисел. */
function sequence(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length] ?? 0.5;
}

describe('nextPrice', () => {
  it('moves the price by the shock and rounds to cents', () => {
    expect(nextPrice(100, 0.01, 0)).toBe(100);
    expect(nextPrice(100, 0.01, 1)).toBeCloseTo(101.01, 2);
    expect(nextPrice(100, 0.01, -1)).toBeCloseTo(99.0, 2);
  });

  it('keeps four decimals for cheap assets', () => {
    expect(nextPrice(1.2345, 0, 0)).toBe(1.2345);
  });
});

describe('pickShare', () => {
  it('picks a share without repeats and at least one item', () => {
    const picked = pickShare(['a', 'b', 'c', 'd'], 0.5, sequence(0, 0, 0.99));
    expect(picked).toHaveLength(2);
    expect(new Set(picked).size).toBe(2);
    expect(pickShare(['a', 'b'], 0, Math.random)).toHaveLength(1);
  });
});

describe('createPriceFeed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const assets = [
    { ticker: 'AAPL', price: 100, class: 'stock' as const },
    { ticker: 'BTC', price: 50_000, class: 'crypto' as const },
  ];

  it('emits ticks every 2–4 seconds for subscribed tickers only', () => {
    const feed = createPriceFeed(assets, { random: sequence(0.3, 0.7, 0.2, 0.9) });
    const onTick = vi.fn();
    feed.subscribe(['AAPL', 'BTC', 'UNKNOWN'], onTick);

    vi.advanceTimersByTime(1_999);
    expect(onTick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2_100);
    expect(onTick).toHaveBeenCalledTimes(1);
    const ticks = onTick.mock.calls[0]?.[0] as { ticker: string; price: number }[];
    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      expect(['AAPL', 'BTC']).toContain(tick.ticker);
      expect(tick.price).toBeGreaterThan(0);
    }
  });

  it('continues from the last price and stops after unsubscribe', () => {
    const [aapl] = assets;
    if (!aapl) throw new Error('fixture');
    const feed = createPriceFeed([aapl], { random: sequence(0.9, 0.9, 0.9) });
    const prices: number[] = [];
    const unsubscribe = feed.subscribe(['AAPL'], (ticks) => {
      prices.push(ticks[0]?.price ?? 0);
    });
    vi.advanceTimersByTime(12_000);
    expect(prices.length).toBeGreaterThanOrEqual(3);
    // Цена уходит от стартовой постепенно, а не прыгает к новому значению каждый раз.
    expect(Math.abs((prices.at(-1) ?? 0) - 100)).toBeLessThan(5);

    unsubscribe();
    const count = prices.length;
    vi.advanceTimersByTime(20_000);
    expect(prices).toHaveLength(count);
  });
});
