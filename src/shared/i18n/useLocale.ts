import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatDate,
  formatMoney,
  formatMonth,
  formatNumber,
  formatPercent,
  formatPrice,
  formatQuantity,
  formatShortDate,
  type Locale,
  type MoneyOptions,
} from '@/shared/lib/format';
import type { IsoDate, IsoMonth } from '@/shared/model';
import { changeLocale, isLocale } from './config';

export function useLocale(): { locale: Locale; setLocale: (locale: Locale) => void } {
  const { i18n } = useTranslation();
  const locale = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';
  return {
    locale,
    setLocale: (next) => {
      void changeLocale(next);
    },
  };
}

/** Форматтеры, привязанные к текущему языку: при переключении RU/EN всё перерисуется. */
export function useFormat() {
  const { locale } = useLocale();
  return useMemo(
    () => ({
      locale,
      money: (value: number, options?: MoneyOptions) => formatMoney(value, locale, options),
      price: (value: number) => formatPrice(value, locale),
      percent: (fraction: number, options?: { signed?: boolean; decimals?: number }) =>
        formatPercent(fraction, locale, options),
      number: (value: number, options?: { decimals?: number; signed?: boolean }) =>
        formatNumber(value, locale, options),
      quantity: (value: number, precision: number) => formatQuantity(value, locale, precision),
      date: (date: IsoDate) => formatDate(date, locale),
      shortDate: (date: IsoDate) => formatShortDate(date, locale),
      month: (month: IsoMonth) => formatMonth(month, locale),
    }),
    [locale],
  );
}

export type Formatters = ReturnType<typeof useFormat>;
