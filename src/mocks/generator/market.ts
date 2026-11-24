import type { Candle, IsoDate } from '@/shared/model';
import { roundTo } from '@/shared/lib/finance';
import type { AssetSpec, MarketFactor } from './assets';
import type { Random } from './random';

const DT = 1 / 252;

/**
 * Режимы рынка — заранее заданные эпизоды, чтобы на графиках гарантированно были
 * заметные просадки и восстановления при любом seed. Окна — доли длины истории.
 */
interface Regime {
  factor: MarketFactor;
  from: number;
  to: number;
  /** Добавка к годовому дрейфу на время режима. */
  driftShift: number;
}

const REGIMES: readonly Regime[] = [
  { factor: 'crypto', from: 0.18, to: 0.4, driftShift: -1.4 }, // «криптозима»
  { factor: 'equity', from: 0.3, to: 0.4, driftShift: -0.9 }, // коррекция рынка
  { factor: 'equity', from: 0.4, to: 0.55, driftShift: 0.7 }, // восстановление
  { factor: 'rates', from: 0.25, to: 0.45, driftShift: -0.12 }, // рост ставок
  { factor: 'crypto', from: 0.6, to: 0.75, driftShift: 1.1 }, // крипто-ралли
  { factor: 'equity', from: 0.82, to: 0.86, driftShift: -0.6 }, // короткая распродажа
];

const BENCHMARK = { drift: 0.09, volatility: 0.16, start: 1_000 };

function driftShift(factor: MarketFactor, day: number, days: number): number {
  const t = day / days;
  let shift = 0;
  for (const regime of REGIMES) {
    if (regime.factor === factor && t >= regime.from && t < regime.to) shift += regime.driftShift;
  }
  return shift;
}

type FactorShocks = Record<MarketFactor, number[]>;

function generateFactorShocks(days: number, rng: Random): FactorShocks {
  const shocks: FactorShocks = { equity: [], crypto: [], rates: [] };
  for (let i = 0; i < days; i++) {
    shocks.equity.push(rng.normal());
    shocks.crypto.push(rng.normal());
    shocks.rates.push(rng.normal());
  }
  return shocks;
}

/** Кумулятивные лог-цены по модели геометрического броуновского движения. */
function logPath(days: number, dailyLogReturn: (day: number) => number): number[] {
  const path: number[] = [0];
  for (let i = 1; i < days; i++) path.push((path[i - 1] ?? 0) + dailyLogReturn(i));
  return path;
}

function priceDecimals(price: number): number {
  return price < 10 ? 4 : 2;
}

/** Строит OHLCV из ряда закрытий: open — гэп от прошлого закрытия, high/low — внутридневной шум. */
function toCandles(
  dates: readonly IsoDate[],
  closes: readonly number[],
  dailyVol: number,
  baseVolume: number,
  rng: Random,
): Candle[] {
  return dates.map((date, i) => {
    const close = closes[i] ?? 0;
    const prevClose = closes[i - 1] ?? close;
    const decimals = priceDecimals(close);
    const open = roundTo(prevClose * Math.exp(dailyVol * 0.3 * rng.normal()), decimals);
    const c = roundTo(close, decimals);
    const high = roundTo(
      Math.max(open, c) * Math.exp(Math.abs(rng.normal()) * dailyVol * 0.5),
      decimals,
    );
    const low = roundTo(
      Math.min(open, c) * Math.exp(-Math.abs(rng.normal()) * dailyVol * 0.5),
      decimals,
    );
    const move = Math.abs(Math.log(close / prevClose)) / dailyVol;
    const volume = Math.round(baseVolume * Math.exp(0.35 * rng.normal()) * (0.8 + 0.4 * move));
    return {
      date,
      open,
      high: Math.max(high, open, c),
      low: Math.min(low, open, c),
      close: c,
      volume,
    };
  });
}

export interface MarketData {
  candles: Record<string, Candle[]>;
  benchmark: Candle[];
}

/**
 * Цены всех активов и бенчмарка. Доходность актива = дрейф + σ·(ρ·Z_фактора + √(1−ρ²)·Z_свой),
 * поэтому акции падают вместе с рынком, а крипта — вместе. Путь масштабируется так,
 * чтобы последняя цена совпала с `spec.price`.
 */
export function generateMarket(
  dates: readonly IsoDate[],
  specs: readonly AssetSpec[],
  rng: Random,
): MarketData {
  const days = dates.length;
  const shocks = generateFactorShocks(days, rng);
  const sqrtDt = Math.sqrt(DT);

  const benchmarkPath = logPath(days, (day) => {
    const drift = BENCHMARK.drift + driftShift('equity', day, days);
    const z = shocks.equity[day] ?? 0;
    return (drift - BENCHMARK.volatility ** 2 / 2) * DT + BENCHMARK.volatility * sqrtDt * z;
  });
  const benchmarkCloses = benchmarkPath.map((l) => BENCHMARK.start * Math.exp(l));
  const benchmark = toCandles(dates, benchmarkCloses, BENCHMARK.volatility * sqrtDt, 0, rng);

  const candles: Record<string, Candle[]> = {};
  for (const spec of specs) {
    const idio = Math.sqrt(1 - spec.loading ** 2);
    const path = logPath(days, (day) => {
      const drift = spec.drift + spec.loading * driftShift(spec.factor, day, days);
      const z = spec.loading * (shocks[spec.factor][day] ?? 0) + idio * rng.normal();
      return (drift - spec.volatility ** 2 / 2) * DT + spec.volatility * sqrtDt * z;
    });
    const last = path.at(-1) ?? 0;
    const closes = path.map((l) => spec.price * Math.exp(l - last));
    candles[spec.ticker] = toCandles(dates, closes, spec.volatility * sqrtDt, spec.volume, rng);
  }

  return { candles, benchmark };
}
