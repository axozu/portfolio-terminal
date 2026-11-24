import { useTranslation } from 'react-i18next';
import { useLiveSummary } from '@/entities/portfolio';
import { useFormat } from '@/shared/i18n';
import { ChartSkeleton, DonutChart } from '@/shared/ui/charts';
import { Panel } from '@/shared/ui/Panel';
import { EmptyState, ErrorState } from '@/shared/ui/states';
import { orderAllocation } from '../model/selectors';

export function AllocationPanel() {
  const { t } = useTranslation();
  const format = useFormat();
  const { data, isPending, isError, refetch } = useLiveSummary();
  const slices = data ? orderAllocation(data.allocation) : [];

  return (
    <Panel title={t('overview.allocation.title')} className="xl:col-span-4">
      {isPending ? (
        <ChartSkeleton className="h-44 w-full" />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : slices.length === 0 ? (
        <EmptyState />
      ) : (
        <DonutChart
          ariaLabel={t('overview.allocation.aria')}
          centerLabel={t('overview.allocation.total')}
          centerValue={format.money(data.totalValue, { compact: true })}
          slices={slices.map((s) => ({ ...s, label: t(`assetClass.${s.key}`) }))}
        />
      )}
    </Panel>
  );
}
