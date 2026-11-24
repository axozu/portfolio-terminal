import type { IsoDate, IsoMonth } from '@/shared/model';

export const LOCALES = ['en', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];

const INTL_LOCALE: Record<Locale, string> = { en: 'en-US', ru: 'ru-RU' };

/** Типографский минус (U+2212) вместо дефиса: ровнее в колонках цифр. */
export const MINUS = '−';

export type Trend = 'up' | 'down' | 'flat';

/** Направление изменения с допуском, чтобы −0.000001 не показывался как падение. */
export function trendOf(value: number, epsilon = 1e-9): Trend {
  if (value > epsilon) return 'up';
  if (value < -epsilon) return 'down';
  return 'flat';
}

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function numberFormat(locale: Locale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `n|${locale}|${JSON.stringify(options)}`;
  let format = cache.get(key);
  if (!(format instanceof Intl.NumberFormat)) {
    format = new Intl.NumberFormat(INTL_LOCALE[locale], options);
    cache.set(key, format);
  }
  return format;
}

function dateFormat(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `d|${locale}|${JSON.stringify(options)}`;
  let format = cache.get(key);
  if (!(format instanceof Intl.DateTimeFormat)) {
    format = new Intl.DateTimeFormat(INTL_LOCALE[locale], { ...options, timeZone: 'UTC' });
    cache.set(key, format);
  }
  return format;
}

function withSign(formatted: string, value: number, signed: boolean): string {
  const trend = trendOf(value);
  if (trend === 'down') return `${MINUS}${formatted}`;
  if (trend === 'up' && signed) return `+${formatted}`;
  return formatted;
}

export interface MoneyOptions {
  /** Показывать «+» у положительных значений (для изменений и P/L). */
  signed?: boolean;
  /** Компактная запись: $12.3K / 12,3 тыс. $. */
  compact?: boolean;
  /** Знаков после запятой; по умолчанию 2 (для компактной записи — до 1). */
  decimals?: number;
}

/** Сумма в USD по правилам локали: `$12,345.67` / `12 345,67 $`. */
export function formatMoney(value: number, locale: Locale, options: MoneyOptions = {}): string {
  const { signed = false, compact = false, decimals } = options;
  const format = numberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: compact ? 0 : (decimals ?? 2),
    maximumFractionDigits: compact ? (decimals ?? 1) : (decimals ?? 2),
  });
  return withSign(format.format(Math.abs(value)), value, signed);
}

/** Доля → проценты: 0.1234 → `12.34%` / `12,34 %`. */
export function formatPercent(
  fraction: number,
  locale: Locale,
  options: { signed?: boolean; decimals?: number } = {},
): string {
  const { signed = false, decimals = 2 } = options;
  const format = numberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return withSign(format.format(Math.abs(fraction)), fraction, signed);
}

export function formatNumber(
  value: number,
  locale: Locale,
  options: { decimals?: number; signed?: boolean } = {},
): string {
  const { decimals = 2, signed = false } = options;
  const format = numberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return withSign(format.format(Math.abs(value)), value, signed);
}

/** Количество: без лишних нулей, но не больше точности актива (4 для акций, 8 для крипты). */
export function formatQuantity(value: number, locale: Locale, precision: number): string {
  return numberFormat(locale, { maximumFractionDigits: precision }).format(value);
}

/** Цена актива: у дешёвых активов больше знаков. */
export function formatPrice(value: number, locale: Locale): string {
  return formatMoney(value, locale, { decimals: Math.abs(value) < 10 ? 4 : 2 });
}

function parseUtc(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** `Nov 24, 2026` / `24 нояб. 2026 г.` — дата без таймзоны, сдвига не будет. */
export function formatDate(date: IsoDate, locale: Locale): string {
  return dateFormat(locale, { dateStyle: 'medium' }).format(parseUtc(date));
}

/** `Nov 24` / `24 нояб.` — для осей графиков. */
export function formatShortDate(date: IsoDate, locale: Locale): string {
  return dateFormat(locale, { day: 'numeric', month: 'short' }).format(parseUtc(date));
}

/** `Nov 2026` / `нояб. 2026 г.` */
export function formatMonth(month: IsoMonth, locale: Locale): string {
  return dateFormat(locale, { month: 'short', year: 'numeric' }).format(parseUtc(`${month}-01`));
}
