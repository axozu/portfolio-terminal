import type { FieldError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useFormat } from '@/shared/i18n';
import { isValidationCode, type ValidationCode } from '@/shared/model';

/** Текст ошибки поля на текущем языке; параметры форматируются по локали. */
export function useErrorMessage(): (error: FieldError | undefined) => string | undefined {
  const { t } = useTranslation();
  const format = useFormat();

  return (error) => {
    if (!error) return undefined;
    // error.type в react-hook-form типизирован как ключи правил; у нас там код валидации.
    const type: string = error.type;
    const code: ValidationCode = isValidationCode(type) ? type : 'invalid';
    const params = error.types ?? {};
    const raw = (key: string) => {
      const value = params[key];
      return typeof value === 'string' ? value : '';
    };
    switch (code) {
      case 'insufficient_cash':
        return t('validation.insufficient_cash', {
          available: format.money(Number(raw('available'))),
        });
      case 'insufficient_quantity':
        return t('validation.insufficient_quantity', {
          available: format.quantity(Number(raw('available')), 8),
        });
      case 'date_before_history':
        return t('validation.date_before_history', { date: format.date(raw('date')) });
      case 'too_many_decimals':
        return t('validation.too_many_decimals', { precision: raw('precision') });
      default:
        return t(`validation.${code}`);
    }
  };
}
