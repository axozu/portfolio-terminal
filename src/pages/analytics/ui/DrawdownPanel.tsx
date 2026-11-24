import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DatedValue } from '@/shared/lib/finance';
import { useFormat } from '@/shared/i18n';
import { TimeSeriesChart, type TimeSeries } from '@/shared/ui/charts';
import { Panel } from '@/shared/ui/Panel';
import { summarizeDrawdown } from '../model/summaries';

export function DrawdownPanel({ series }: { series: readonly DatedValue[] }) {
  const { t } = useTranslation();
  const format = useFormat();
  const chartSeries = useMemo<TimeSeries[]>(
    () => [
      {
        id: 'drawdown',
        label: t('analytics.drawdown.series'),
        slot: '--chart-3',
        kind: 'area',
        ceiling: 0,
        data: series.map((p) => ({ date: p.date, value: p.value })),
      },
    ],
    [series, t],
  );
  const summary = summarizeDrawdown(series);

  return (
    <Panel
      title={t('analytics.drawdown.title')}
      className="xl:col-span-8"
      bodyClassName="flex flex-col"
    >
      <TimeSeriesChart
        series={chartSeries}
        valueFormat="percent"
        ariaLabel={t('analytics.drawdown.aria')}
        summary={
          summary
            ? t('analytics.drawdown.summary', {
                max: format.percent(summary.max, { decimals: 1 }),
                date: format.date(summary.maxDate),
                current: format.percent(summary.current, { decimals: 1 }),
              })
            : ''
        }
        className="flex min-h-64 flex-1 flex-col md:min-h-72"
      />
    </Panel>
  );
}
