/** Детерминированный генератор случайных чисел. Одинаковый seed → одинаковая последовательность. */
export interface Random {
  /** Равномерно в [0, 1). */
  next(): number;
  /** Стандартное нормальное распределение N(0, 1). */
  normal(): number;
  /** Равномерно в [min, max). */
  between(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
}

/** mulberry32 — быстрый 32-битный PRNG; нормальное распределение — преобразованием Бокса — Мюллера. */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  let spareNormal: number | null = null;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const normal = (): number => {
    if (spareNormal !== null) {
      const value = spareNormal;
      spareNormal = null;
      return value;
    }
    let u = 0;
    while (u === 0) u = next();
    const v = next();
    const magnitude = Math.sqrt(-2 * Math.log(u));
    spareNormal = magnitude * Math.sin(2 * Math.PI * v);
    return magnitude * Math.cos(2 * Math.PI * v);
  };

  return {
    next,
    normal,
    between: (min, max) => min + (max - min) * next(),
    chance: (probability) => next() < probability,
    pick: <T>(items: readonly T[]): T => {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new Error('Cannot pick from an empty list');
      return item;
    },
  };
}
