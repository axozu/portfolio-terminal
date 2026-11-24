import { useTranslation } from 'react-i18next';
import { useAnalytics } from '@/entities/portfolio';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/skeleton';
import { ErrorState } from '@/shared/ui/states';
import { DividendsPanel } from './ui/DividendsPanel';
import { DrawdownPanel } from './ui/DrawdownPanel';
import { HeatmapPanel } from './ui/HeatmapPanel';
import { MetricsStrip } from './ui/MetricsStrip';
import { SectorsPanel } from './ui/SectorsPanel';

export function AnalyticsPage() {
  const { t } = useTranslation();
  const { data, isPending, isError, refetch } = useAnalytics();

  return (
    <section data-testid="page-analytics" className="flex flex-col gap-3 md:gap-4">
      <PageHeader title={t('pages.analytics')} />
      {isPending ? (
        <div className="grid gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : isError ? (
        <div className="border bg-card px-4">
          <ErrorState onRetry={() => void refetch()} />
        </div>
      ) : (
        <>
          <MetricsStrip data={data} />
          <div className="grid gap-3 md:gap-4 xl:grid-cols-12">
            <HeatmapPanel monthly={data.monthlyReturns} />
            <DrawdownPanel series={data.drawdown} />
            <SectorsPanel sectors={data.sectors} />
            <DividendsPanel months={data.dividendsByMonth} />
          </div>
        </>
      )}
    </section>
  );
}
