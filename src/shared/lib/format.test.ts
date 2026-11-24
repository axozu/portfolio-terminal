import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatMoney,
  formatMonth,
  formatNumber,
  formatPercent,
  formatPrice,
  formatQuantity,
  formatShortDate,
  MINUS,
  trendOf,
} from './format';

/** Intl ставит в ru-RU неразрывные пробелы (U+00A0 / U+202F) — сравниваем с обычными. */
const plain = (s: string) => s.replace(/[  ]/g, ' ');

describe('formatMoney', () => {
  it('formats USD per locale', () => {
    expect(formatMoney(12345.678, 'en')).toBe('$12,345.68');
    expect(plain(formatMoney(12345.678, 'ru'))).toBe('12 345,68 $');
  });

  it('uses a true minus and an optional plus', () => {
    expect(formatMoney(-5, 'en')).toBe(`${MINUS}$5.00`);
    expect(formatMoney(5, 'en', { signed: true })).toBe('+$5.00');
    expect(plain(formatMoney(-1234.5, 'ru', { signed: true }))).toBe(`${MINUS}1 234,50 $`);
    expect(formatMoney(0, 'en', { signed: true })).toBe('$0.00');
  });

  it('supports compact notation', () => {
    expect(formatMoney(184_320, 'en', { compact: true })).toBe('$184.3K');
    expect(plain(formatMoney(184_320, 'ru', { compact: true }))).toBe('184,3 тыс. $');
  });
});

describe('formatPercent', () => {
  it('formats fractions as percent per locale', () => {
    expect(formatPercent(0.12345, 'en')).toBe('12.35%');
    expect(plain(formatPercent(0.12345, 'ru'))).toBe('12,35 %');
  });

  it('signs changes', () => {
    expect(formatPercent(-0.031, 'en', { signed: true })).toBe(`${MINUS}3.10%`);
    expect(formatPercent(0.031, 'en', { signed: true, decimals: 1 })).toBe('+3.1%');
  });
});

describe('numbers', () => {
  it('formats plain numbers and quantities', () => {
    expect(formatNumber(1.5, 'en')).toBe('1.50');
    expect(formatNumber(-0.75, 'ru', { signed: true })).toBe(`${MINUS}0,75`);
    expect(formatQuantity(0.12345678, 'en', 8)).toBe('0.12345678');
    expect(formatQuantity(12, 'en', 4)).toBe('12');
    expect(plain(formatQuantity(1234.5, 'ru', 4))).toBe('1 234,5');
  });

  it('gives cheap prices more decimals', () => {
    expect(formatPrice(3.14159, 'en')).toBe('$3.1416');
    expect(formatPrice(228, 'en')).toBe('$228.00');
  });
});

describe('dates', () => {
  it('formats ISO dates without timezone shifts', () => {
    expect(formatDate('2026-11-24', 'en')).toBe('Nov 24, 2026');
    expect(formatDate('2026-11-24', 'ru')).toBe('24 нояб. 2026 г.');
    expect(formatDate('2026-01-01', 'en')).toBe('Jan 1, 2026');
  });

  it('formats short dates and months', () => {
    expect(formatShortDate('2026-03-05', 'en')).toBe('Mar 5');
    expect(formatShortDate('2026-03-05', 'ru')).toBe('5 мар.');
    expect(formatMonth('2026-11', 'en')).toBe('Nov 2026');
    expect(formatMonth('2026-11', 'ru')).toBe('нояб. 2026 г.');
  });
});

describe('trendOf', () => {
  it('ignores float noise around zero', () => {
    expect(trendOf(0.01)).toBe('up');
    expect(trendOf(-0.01)).toBe('down');
    expect(trendOf(-1e-12)).toBe('flat');
  });
});
