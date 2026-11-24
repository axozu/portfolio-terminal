import { useTranslation } from 'react-i18next';
import { useFormat } from '@/shared/i18n';
import { usePortfolioSummary } from '@/entities/portfolio';
import { PageHeader } from '@/shared/ui/PageHeader';
import { AllocationPanel } from './ui/AllocationPanel';
import { KpiStrip } from './ui/KpiStrip';
import { MoversPanel } from './ui/MoversPanel';
import { RecentTransactionsPanel } from './ui/RecentTransactionsPanel';
import { ValueChartPanel } from './ui/ValueChartPanel';

export function OverviewPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const { data } = usePortfolioSummary();

  return (
    <section data-testid="page-overview" className="flex flex-col gap-3 md:gap-4">
      <PageHeader title={t('pages.overview')} meta={data ? format.date(data.asOf) : undefined} />
      <KpiStrip />
      <div className="grid gap-3 md:gap-4 xl:grid-cols-12">
        <ValueChartPanel />
        <AllocationPanel />
        <MoversPanel />
        <RecentTransactionsPanel />
      </div>
    </section>
  );
}
