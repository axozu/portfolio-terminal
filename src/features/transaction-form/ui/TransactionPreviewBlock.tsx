import { useTranslation } from 'react-i18next';
import { usePortfolioSummary, usePositions } from '@/entities/portfolio';
import { useFormat } from '@/shared/i18n';
import type { Transaction } from '@/shared/model';
import { computePreview, type TransactionFormValues } from '../model/form';

interface PreviewProps {
  values: TransactionFormValues;
  original?: Transaction;
}

/** Живой предпросмотр: сумма сделки, кэш и позиция после неё (от текущего портфеля). */
export function TransactionPreviewBlock({ values, original }: PreviewProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const { data: summary } = usePortfolioSummary();
  const { data: positions } = usePositions();
  const position = positions?.find((p) => p.ticker === values.ticker);
  const preview = computePreview(
    values,
    { cash: summary?.cash ?? 0, positionQuantity: position?.quantity ?? 0 },
    original,
  );
  const dash = '—';

  return (
    <section aria-live="polite" className="border bg-background p-3">
      <h3 className="mb-2 text-xs text-muted-foreground">{t('transactionForm.preview')}</h3>
      <dl className="grid gap-1.5 text-[13px]">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t('transactionForm.total')}</dt>
          <dd className="num text-foreground">
            {preview.total === null ? dash : format.money(preview.total, { signed: true })}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t('transactionForm.cashAfter')}</dt>
          <dd
            className={
              preview.cashAfter !== null && preview.cashAfter < 0
                ? 'num text-loss'
                : 'num text-foreground'
            }
          >
            {preview.cashAfter === null ? dash : format.money(preview.cashAfter)}
          </dd>
        </div>
        {values.ticker !== '' && (values.type === 'buy' || values.type === 'sell') ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">
              {t('transactionForm.positionAfter', { ticker: values.ticker })}
            </dt>
            <dd
              className={
                preview.positionAfter !== null && preview.positionAfter < 0
                  ? 'num text-loss'
                  : 'num text-foreground'
              }
            >
              {preview.positionAfter === null ? dash : format.quantity(preview.positionAfter, 8)}
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-2 text-[11px] text-muted-foreground">{t('transactionForm.previewHint')}</p>
    </section>
  );
}
