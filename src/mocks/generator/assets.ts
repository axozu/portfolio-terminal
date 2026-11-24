import type { Asset } from '@/shared/model';

/** Общий рыночный фактор, от которого зависит актив (даёт коррелированные движения). */
export type MarketFactor = 'equity' | 'crypto' | 'rates';

/**
 * Параметры генерации актива. Цены вымышленные, но правдоподобного порядка.
 * Все годовые величины — в долях (0.25 = 25%).
 */
export interface AssetSpec extends Asset {
  /** Цена последнего дня истории — путь масштабируется так, чтобы закончиться на ней. */
  price: number;
  /** Ожидаемая годовая доходность. */
  drift: number;
  /** Годовая волатильность. */
  volatility: number;
  factor: MarketFactor;
  /** Корреляция с фактором, 0…1. */
  loading: number;
  /** Годовая дивидендная доходность (выплачивается поквартально, если ≥ 2.5%). */
  dividendYield: number;
  /** Типичный дневной объём, штук. */
  volume: number;
}

type SpecRow = [
  ticker: string,
  name: string,
  cls: Asset['class'],
  sector: Asset['sector'],
  price: number,
  drift: number,
  volatility: number,
  factor: MarketFactor,
  loading: number,
  dividendYield: number,
  volume: number,
];

// prettier-ignore
const ROWS: SpecRow[] = [
  ['AAPL',  'Apple Inc.',                        'stock',  'technology',             228,    0.14,  0.28, 'equity', 0.75, 0.005, 55e6],
  ['MSFT',  'Microsoft Corp.',                   'stock',  'technology',             415,    0.13,  0.26, 'equity', 0.75, 0.007, 22e6],
  ['NVDA',  'NVIDIA Corp.',                      'stock',  'technology',             138,    0.35,  0.50, 'equity', 0.65, 0,     300e6],
  ['AMZN',  'Amazon.com Inc.',                   'stock',  'consumer_discretionary', 205,    0.14,  0.32, 'equity', 0.70, 0,     40e6],
  ['GOOGL', 'Alphabet Inc.',                     'stock',  'communication',          172,    0.12,  0.30, 'equity', 0.70, 0.005, 25e6],
  ['JNJ',   'Johnson & Johnson',                 'stock',  'healthcare',             155,    0.04,  0.16, 'equity', 0.45, 0.031, 7e6],
  ['XOM',   'Exxon Mobil Corp.',                 'stock',  'energy',                 118,    0.06,  0.25, 'equity', 0.45, 0.033, 15e6],
  ['JPM',   'JPMorgan Chase & Co.',              'stock',  'financials',             240,    0.10,  0.24, 'equity', 0.70, 0.022, 9e6],
  ['V',     'Visa Inc.',                         'stock',  'financials',             310,    0.10,  0.20, 'equity', 0.70, 0.007, 6e6],
  ['KO',    'The Coca-Cola Company',             'stock',  'consumer_staples',       68,     0.05,  0.15, 'equity', 0.40, 0.029, 12e6],
  ['PG',    'Procter & Gamble Co.',              'stock',  'consumer_staples',       168,    0.05,  0.16, 'equity', 0.40, 0.024, 6e6],
  ['VOO',   'Vanguard S&P 500 ETF',              'etf',    'diversified',            540,    0.10,  0.17, 'equity', 0.98, 0.013, 5e6],
  ['QQQ',   'Invesco QQQ Trust',                 'etf',    'technology',             505,    0.13,  0.22, 'equity', 0.92, 0.006, 35e6],
  ['SCHD',  'Schwab US Dividend Equity ETF',     'etf',    'diversified',            28,     0.07,  0.15, 'equity', 0.85, 0.035, 15e6],
  ['VNQ',   'Vanguard Real Estate ETF',          'etf',    'real_estate',            92,     0.05,  0.21, 'equity', 0.70, 0.039, 4e6],
  ['BND',   'Vanguard Total Bond Market ETF',    'bond',   null,                     73,     0.01,  0.06, 'rates',  0.90, 0.035, 6e6],
  ['TLT',   'iShares 20+ Year Treasury Bond ETF','bond',   null,                     92,    -0.01,  0.15, 'rates',  0.95, 0.040, 30e6],
  ['BTC',   'Bitcoin',                           'crypto', null,                     96_000, 0.40,  0.60, 'crypto', 0.90, 0,     30e3],
  ['ETH',   'Ethereum',                          'crypto', null,                     3_400,  0.30,  0.75, 'crypto', 0.85, 0,     400e3],
  ['SOL',   'Solana',                            'crypto', null,                     240,    0.50,  0.95, 'crypto', 0.75, 0,     3e6],
];

export const ASSET_SPECS: readonly AssetSpec[] = ROWS.map(
  ([
    ticker,
    name,
    cls,
    sector,
    price,
    drift,
    volatility,
    factor,
    loading,
    dividendYield,
    volume,
  ]) => ({
    ticker,
    name,
    class: cls,
    sector,
    quantityPrecision: cls === 'crypto' ? 8 : 4,
    price,
    drift,
    volatility,
    factor,
    loading,
    dividendYield,
    volume,
  }),
);

export function toAsset(spec: AssetSpec): Asset {
  return {
    ticker: spec.ticker,
    name: spec.name,
    class: spec.class,
    sector: spec.sector,
    quantityPrecision: spec.quantityPrecision,
  };
}
