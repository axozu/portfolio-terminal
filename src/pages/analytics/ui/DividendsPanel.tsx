import { useTranslation } from 'react-i18next';
import type { MonthlyAmount } from '@/shared/lib/finance';
import { useFormat } from '@/shared/i18n';
import { MonthlyBarChart } from '@/shared/ui/charts';
import { Panel } from '@/shared/ui/Panel';
import { EmptyState } from '@/shared/ui/states';
import { summarizeDividends } from '../model/summaries';

export function DividendsPanel({ months }: { months: readonly MonthlyAmount[] }) {
  const { t } = useTranslation();
  const format = useFormat();
  const summary = summarizeDividends(months);

  return (
    <Panel title={t('analytics.dividends.title')} className="xl:col-span-12">
      {summary ? (
        <MonthlyBarChart
          data={months}
          slot="--chart-5"
          ariaLabel={t('analytics.dividends.aria')}
          summary={t('analytics.dividends.summary', {
            from: format.month(summary.from),
            to: format.month(summary.to),
            total: format.money(summary.total),
            maxMonth: format.month(summary.maxMonth),
            max: format.money(summary.max),
          })}
          className="h-56"
        />
      ) : (
        <EmptyState description={t('analytics.dividends.empty')} />
      )}
    </Panel>
  );
}
