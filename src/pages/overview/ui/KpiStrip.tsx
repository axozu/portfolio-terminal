import { useTranslation } from 'react-i18next';
import { useLiveSummary } from '@/entities/portfolio';
import { Flash } from '@/shared/ui/Flash';
import { useFormat } from '@/shared/i18n';
import { Delta } from '@/shared/ui/Delta';
import { Kpi, KpiGrid } from '@/shared/ui/KpiGrid';
import { Skeleton } from '@/shared/ui/skeleton';
import { ErrorState } from '@/shared/ui/states';

/** Строка ключевых показателей: одна панель с разделителями, а не пять одинаковых карточек. */
export function KpiStrip() {
  const { t } = useTranslation();
  const format = useFormat();
  const { data, isPending, isError, refetch } = useLiveSummary();

  if (isPending) {
    return (
      <KpiGrid>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 px-4 py-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        ))}
      </KpiGrid>
    );
  }
  if (isError) {
    return (
      <div className="border bg-card px-4">
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  return (
    <KpiGrid>
      <Kpi
        label={t('overview.kpi.totalValue')}
        value={<Flash value={data.totalValue}>{format.money(data.totalValue)}</Flash>}
        sub={t('overview.kpi.invested', {
          amount: format.money(data.netInvested, { compact: true }),
        })}
      />
      <Kpi
        label={t('overview.kpi.dayChange')}
        value={<Delta value={data.dayChange} kind="money" arrow={false} />}
        sub={<Delta value={data.dayChangePct} kind="percent" />}
      />
      <Kpi
        label={t('overview.kpi.totalReturn')}
        hint={t('overview.kpi.totalReturnHint')}
        value={
          data.totalReturnPct === null ? '—' : <Delta value={data.totalReturnPct} kind="percent" />
        }
        sub={<Delta value={data.totalReturn} kind="money" arrow={false} />}
      />
      <Kpi
        label={t('overview.kpi.unrealized')}
        value={<Delta value={data.unrealizedPnl} kind="money" arrow={false} />}
      />
      <Kpi
        label={t('overview.kpi.cash')}
        value={format.money(data.cash)}
        sub={t('overview.kpi.ofPortfolio', {
          share: format.percent(data.totalValue > 0 ? data.cash / data.totalValue : 0, {
            decimals: 1,
          }),
        })}
      />
    </KpiGrid>
  );
}
