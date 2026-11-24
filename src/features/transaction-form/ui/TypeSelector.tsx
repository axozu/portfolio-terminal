import type { UseFormRegisterReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TRANSACTION_TYPES } from '@/shared/model';

/**
 * Тип сделки — группа нативных радиокнопок, оформленная сегментами:
 * стрелки на клавиатуре и скринридеры работают без дополнительного кода.
 */
export function TypeSelector({ registration }: { registration: UseFormRegisterReturn<'type'> }) {
  const { t } = useTranslation();
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs text-muted-foreground">{t('transactionForm.type')}</legend>
      <div className="flex flex-wrap gap-px border bg-border">
        {TRANSACTION_TYPES.map((type) => (
          <label
            key={type}
            className="flex h-9 flex-[1_1_30%] cursor-pointer items-center justify-center bg-card text-xs text-muted-foreground has-[:checked]:bg-accent has-[:checked]:text-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ring sm:flex-1"
          >
            <input type="radio" value={type} className="sr-only" {...registration} />
            {t(`transactionType.${type}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
