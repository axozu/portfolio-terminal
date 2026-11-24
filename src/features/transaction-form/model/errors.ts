import type {
  FieldError as FormError,
  FieldErrors as FormErrors,
  UseFormSetError,
} from 'react-hook-form';
import type { FieldError, FieldErrors, TransactionField } from '@/shared/lib/finance';
import type { TransactionFormValues } from './form';

const FIELDS: readonly TransactionField[] = [
  'type',
  'date',
  'ticker',
  'quantity',
  'price',
  'fee',
  'amount',
  'note',
];

/**
 * Ошибка поля в форме: `type` — код валидации, `types` — параметры для текста.
 * Текст собирается при отрисовке, поэтому смена языка переводит уже показанные ошибки.
 */
export function toFormError(error: FieldError): FormError {
  const types: Record<string, string> = {};
  for (const [key, value] of Object.entries(error.params ?? {})) types[key] = String(value);
  return { type: error.code, message: error.code, types };
}

/** Ошибки `validateTransaction` → ошибки полей react-hook-form (для резолвера). */
export function toFormErrors(fieldErrors: FieldErrors): FormErrors<TransactionFormValues> {
  const errors: FormErrors<TransactionFormValues> = {};
  for (const field of FIELDS) {
    const error = fieldErrors[field];
    if (error) errors[field] = toFormError(error);
  }
  return errors;
}

/** Ошибки из ответа 422 → поля формы; фокус — на первое ошибочное поле. */
export function applyServerErrors(
  setError: UseFormSetError<TransactionFormValues>,
  fieldErrors: FieldErrors,
): void {
  let focused = false;
  for (const field of FIELDS) {
    const error = fieldErrors[field];
    if (!error) continue;
    setError(field, toFormError(error), { shouldFocus: !focused });
    focused = true;
  }
}
