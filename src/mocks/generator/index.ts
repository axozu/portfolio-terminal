import type { Asset, Candle, IsoDate, Transaction } from '@/shared/model';
import { lastTradingDayOnOrBefore, tradingDaysEndingAt } from '@/shared/lib/date';
import { ASSET_SPECS, toAsset } from './assets';
import { generateMarket } from './market';
import { createRandom } from './random';
import { generateTransactions } from './transactions';

/**
 * Фиксированный seed: одинаковые данные при каждом открытии, стабильные тесты и скриншоты.
 * Подобран перебором: итог в плюсе (~+40%), максимальная просадка ~−24%, бенчмарк растёт.
 */
export const DEMO_SEED = 24;

/** ≈ 3 года торговых дней (пн–пт). Фиксированная длина → одинаковая форма графиков в любой день. */
export const HISTORY_TRADING_DAYS = 783;

export interface DemoData {
  /** День, относительно которого сгенерированы данные. */
  today: IsoDate;
  /** Торговые дни истории по возрастанию; последний — `today` или ближайший будний день до него. */
  dates: IsoDate[];
  assets: Asset[];
  candles: Record<string, Candle[]>;
  /** Синтетический индекс «Benchmark» для сравнения на графике стоимости. */
  benchmark: Candle[];
  transactions: Transaction[];
}

export interface GenerateOptions {
  today: IsoDate;
  seed?: number;
}

export function generateDemoData({ today, seed = DEMO_SEED }: GenerateOptions): DemoData {
  const dates = tradingDaysEndingAt(lastTradingDayOnOrBefore(today), HISTORY_TRADING_DAYS);
  // Отдельные потоки случайных чисел: изменение сценария сделок не меняет цены.
  const { candles, benchmark } = generateMarket(dates, ASSET_SPECS, createRandom(seed));
  const transactions = generateTransactions(
    dates,
    ASSET_SPECS,
    candles,
    createRandom(seed ^ 0x9e3779b9),
  );

  return { today, dates, assets: ASSET_SPECS.map(toAsset), candles, benchmark, transactions };
}
