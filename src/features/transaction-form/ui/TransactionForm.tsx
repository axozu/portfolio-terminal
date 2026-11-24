import { TriangleAlert } from 'lucide-react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAssets } from '@/entities/asset';
import { useFormat } from '@/shared/i18n';
import { NOTE_MAX_LENGTH } from '@/shared/model';
import type { TransactionFormState } from '@/shared/store/ui';
import { Button } from '@/shared/ui/button';
import { FIELDS_BY_TYPE } from '../model/form';
import { useTransactionForm } from '../model/useTransactionForm';
import { AssetCombobox } from './AssetCombobox';
import { FormField, TextInput } from './FormField';
import { TransactionPreviewBlock } from './TransactionPreviewBlock';
import { TypeSelector } from './TypeSelector';
import { useErrorMessage } from './useErrorMessage';

interface TransactionFormProps {
  state: Extract<TransactionFormState, { open: true }>;
  onClose: () => void;
}

export function TransactionForm({ state, onClose }: TransactionFormProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const message = useErrorMessage();
  const { form, submit, conflict, original, today, isSaving } = useTransactionForm(state, onClose);
  const { register, control, formState } = form;
  const values = useWatch({ control });
  const type = values.type ?? 'buy';
  const fields = new Set(FIELDS_BY_TYPE[type]);
  const { data: assets } = useAssets();
  const historyStart = assets?.find((a) => a.ticker === values.ticker)?.historyStart;
  const errors = formState.errors;

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <TypeSelector registration={register('type')} />

        {fields.has('ticker') ? (
          <FormField label={t('transactionForm.asset')} error={message(errors.ticker)}>
            {(aria) => (
              <Controller
                control={control}
                name="ticker"
                render={({ field }) => (
                  <AssetCombobox
                    {...aria}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            )}
          </FormField>
        ) : null}

        <FormField label={t('transactionForm.date')} error={message(errors.date)}>
          {(aria) => (
            <TextInput type="date" max={today} min={historyStart} {...aria} {...register('date')} />
          )}
        </FormField>

        {fields.has('quantity') ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('transactionForm.quantity')} error={message(errors.quantity)}>
              {(aria) => (
                <TextInput
                  inputMode="decimal"
                  autoComplete="off"
                  {...aria}
                  {...register('quantity')}
                />
              )}
            </FormField>
            <FormField
              label={t('transactionForm.price')}
              error={message(errors.price)}
              hint={t('transactionForm.priceHint')}
            >
              {(aria) => (
                <TextInput
                  inputMode="decimal"
                  autoComplete="off"
                  {...aria}
                  {...register('price')}
                />
              )}
            </FormField>
            <FormField label={t('transactionForm.fee')} error={message(errors.fee)}>
              {(aria) => (
                <TextInput inputMode="decimal" autoComplete="off" {...aria} {...register('fee')} />
              )}
            </FormField>
          </div>
        ) : null}

        {fields.has('amount') ? (
          <FormField label={t('transactionForm.amount')} error={message(errors.amount)}>
            {(aria) => (
              <TextInput inputMode="decimal" autoComplete="off" {...aria} {...register('amount')} />
            )}
          </FormField>
        ) : null}

        <FormField label={t('transactionForm.note')} error={message(errors.note)}>
          {(aria) => (
            <TextInput
              placeholder={t('transactionForm.notePlaceholder')}
              maxLength={NOTE_MAX_LENGTH + 1}
              {...aria}
              {...register('note')}
            />
          )}
        </FormField>

        <TransactionPreviewBlock
          values={{
            type,
            ticker: values.ticker ?? '',
            date: values.date ?? today,
            quantity: values.quantity ?? '',
            price: values.price ?? '',
            fee: values.fee ?? '',
            amount: values.amount ?? '',
            note: values.note ?? '',
          }}
          original={original}
        />

        {conflict ? (
          <p role="alert" className="flex gap-2 border border-loss/40 p-3 text-xs text-foreground">
            <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-loss" />
            {t('transactionForm.conflict', {
              date: format.date(conflict.date),
              reason: t(`ledgerReason.${conflict.reason}`),
            })}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 border-t p-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          {t('transactionForm.cancel')}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {original ? t('transactionForm.save') : t('transactionForm.create')}
        </Button>
      </div>
    </form>
  );
}
