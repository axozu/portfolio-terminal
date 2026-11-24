import { useTranslation } from 'react-i18next';
import type { AnalyticsResponse } from '@/shared/api';
import { useFormat } from '@/shared/i18n';
import { Kpi, KpiGrid } from '@/shared/ui/KpiGrid';
import { trailingDividends } from '../model/summaries';

export function MetricsStrip({ data }: { data: AnalyticsResponse }) {
  const { t } = useTranslation();
  const format = useFormat();
  const period = t('analytics.metrics.period');
  const dash = '—';

  return (
    <KpiGrid className="md:grid-cols-4">
      <Kpi
        label={t('analytics.metrics.volatility')}
        hint={t('analytics.metrics.volatilityHint')}
        value={data.volatility === null ? dash : format.percent(data.volatility, { decimals: 1 })}
        sub={period}
      />
      <Kpi
        label={t('analytics.metrics.maxDrawdown')}
        hint={t('analytics.metrics.maxDrawdownHint')}
        value={
          <span className="text-loss">{format.percent(data.maxDrawdown, { decimals: 1 })}</span>
        }
        sub={period}
      />
      <Kpi
        label={t('analytics.metrics.sharpe')}
        hint={t('analytics.metrics.sharpeHint', {
          rate: format.percent(data.riskFreeRate, { decimals: 0 }),
        })}
        value={data.sharpe === null ? dash : format.number(data.sharpe, { decimals: 2 })}
        sub={period}
      />
      <Kpi
        label={t('analytics.metrics.dividends')}
        hint={t('analytics.metrics.dividendsHint')}
        value={format.money(trailingDividends(data.dividendsByMonth))}
      />
    </KpiGrid>
  );
}
