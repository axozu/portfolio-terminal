import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { assetQueries, useAssets } from '@/entities/asset';
import { useCreateTransaction, useUpdateTransaction } from '@/entities/transaction';
import { isApiError } from '@/shared/api';
import { toIsoDate } from '@/shared/lib/date';
import { validateTransaction, type LedgerConflict } from '@/shared/lib/finance';
import type { Transaction } from '@/shared/model';
import type { TransactionFormState } from '@/shared/store/ui';
import { applyServerErrors, toFormErrors } from './errors';
import {
  closeOnOrBefore,
  constraintsFromAssets,
  defaultFormValues,
  formValuesFromTransaction,
  isTrade,
  toTransactionInput,
  type TransactionFormValues,
} from './form';

type OpenForm = Extract<TransactionFormState, { open: true }>;

/**
 * Логика формы сделки: значения, клиентская валидация (те же правила, что на «сервере»,
 * кроме целостности леджера), подстановка цены закрытия, отправка и разбор ответа 422.
 */
export function useTransactionForm(state: OpenForm, onDone: () => void) {
  const { t } = useTranslation();
  const today = toIsoDate(new Date());
  const { data: assets } = useAssets();
  const constraints = useMemo(() => constraintsFromAssets(assets ?? []), [assets]);
  const original: Transaction | undefined = state.mode === 'edit' ? state.transaction : undefined;
  const [conflict, setConflict] = useState<LedgerConflict | null>(null);

  const validate = (values: TransactionFormValues) =>
    validateTransaction(toTransactionInput(values), { today, assets: constraints });

  const resolver: Resolver<TransactionFormValues> = (values) => {
    const result = validate(values);
    return result.ok
      ? { values, errors: {} }
      : { values: {}, errors: toFormErrors(result.fieldErrors) };
  };

  const form = useForm<TransactionFormValues>({
    defaultValues: original
      ? formValuesFromTransaction(original)
      : defaultFormValues(state.mode === 'create' ? state.prefill : {}, today),
    resolver,
    mode: 'onTouched',
  });

  const [type, ticker, date] = useWatch({
    control: form.control,
    name: ['type', 'ticker', 'date'],
  });
  const candles = useQuery({
    ...assetQueries.candles(ticker, 'ALL'),
    enabled: ticker !== '' && isTrade(type),
  });

  // Цена подставляется из close, когда меняется пара «актив + дата». У изменяемой сделки
  // исходная пара считается уже обработанной, чтобы не затереть сохранённую цену.
  const lastAutofill = useRef(original ? `${original.ticker ?? ''}|${original.date}` : '');
  useEffect(() => {
    const key = `${ticker}|${date}`;
    if (!candles.data || !isTrade(type) || key === lastAutofill.current) return;
    const close = closeOnOrBefore(candles.data.candles, date);
    if (close === undefined) return;
    lastAutofill.current = key;
    form.setValue('price', String(close), { shouldValidate: form.formState.isSubmitted });
  }, [candles.data, ticker, date, type, form]);

  const create = useCreateTransaction();
  const update = useUpdateTransaction();

  const submit = form.handleSubmit(async (values) => {
    setConflict(null);
    const result = validate(values);
    if (!result.ok) return;
    try {
      if (original) await update.mutateAsync({ id: original.id, input: result.value });
      else await create.mutateAsync(result.value);
      toast.success(original ? t('transactionForm.saved') : t('transactionForm.created'));
      onDone();
    } catch (error) {
      if (isApiError(error) && error.status === 422 && error.body) {
        applyServerErrors(form.setError, error.body.fieldErrors ?? {});
        setConflict(error.body.conflict ?? null);
        return;
      }
      toast.error(t('transactionForm.failed'));
    }
  });

  return {
    form,
    submit,
    conflict,
    original,
    today,
    isSaving: create.isPending || update.isPending,
  };
}
