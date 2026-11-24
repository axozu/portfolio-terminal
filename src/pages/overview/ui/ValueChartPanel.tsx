import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortfolioHistory } from '@/entities/portfolio';
import { useFormat } from '@/shared/i18n';
import type { HistoryRange } from '@/shared/lib/finance';
import { cn } from '@/shared/lib/utils';
import { ChartSkeleton, TimeSeriesChart, type TimeSeries } from '@/shared/ui/charts';
import { Panel } from '@/shared/ui/Panel';
import { RangeTabs } from '@/shared/ui/RangeTabs';
import { ErrorState } from '@/shared/ui/states';
import { describeHistory } from '../model/selectors';

const CHART_HEIGHT = 'h-72 md:h-80';

export function ValueChartPanel() {
  const { t } = useTranslation();
  const format = useFormat();
  const [range, setRange] = useState<HistoryRange>('1Y');
  const [compare, setCompare] = useState(false);
  const { data, isPending, isError, refetch, isPlaceholderData } = usePortfolioHistory(range);

  const series = useMemo<TimeSeries[]>(() => {
    if (!data) return [];
    const portfolio: TimeSeries = {
      id: 'portfolio',
      label: t('overview.chart.portfolio'),
      slot: '--chart-1',
      kind: 'area',
      data: data.points,
    };
    if (!compare) return [portfolio];
    const benchmark: TimeSeries = {
      id: 'benchmark',
      label: t('overview.chart.benchmark'),
      slot: '--chart-2',
      kind: 'line',
      data: data.points.map((p) => ({ date: p.date, value: p.benchmark })),
    };
    return [portfolio, benchmark];
  }, [data, compare, t]);

  const description = data ? describeHistory(data.points) : null;
  const summary = description
    ? [
        t('overview.chart.summary', {
          from: format.date(description.from),
          to: format.date(description.to),
          start: format.money(description.start),
          end: format.money(description.end),
          change: format.percent(description.change, { signed: true }),
        }),
        compare
          ? t('overview.chart.summaryBenchmark', { end: format.money(description.benchmarkEnd) })
          : '',
      ].join(' ')
    : '';

  return (
    <Panel
      title={t('overview.chart.title')}
      className="xl:col-span-8"
      actions={
        <>
          <button
            type="button"
            aria-pressed={compare}
            title={t('overview.chart.benchmarkHint')}
            onClick={() => {
              setCompare((v) => !v);
            }}
            className={cn(
              'flex h-7 items-center gap-1.5 px-2 text-xs transition-colors',
              compare ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span
              aria-hidden="true"
              className={cn('h-0.5 w-3', compare ? 'bg-chart-2' : 'bg-muted-foreground')}
            />
            {t('overview.chart.compare')}
          </button>
          <RangeTabs value={range} onChange={setRange} label={t('ranges.label')} />
        </>
      }
    >
      {isPending ? (
        <ChartSkeleton className={CHART_HEIGHT} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <TimeSeriesChart
          series={series}
          valueFormat="money"
          ariaLabel={t('overview.chart.aria')}
          summary={summary}
          className={cn(
            CHART_HEIGHT,
            'flex flex-col transition-opacity',
            isPlaceholderData && 'opacity-60',
          )}
        />
      )}
    </Panel>
  );
}
