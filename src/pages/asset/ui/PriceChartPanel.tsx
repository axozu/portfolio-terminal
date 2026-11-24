import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAssetCandles } from '@/entities/asset';
import { useFormat } from '@/shared/i18n';
import type { HistoryRange } from '@/shared/lib/finance';
import { cn } from '@/shared/lib/utils';
import { CandleChart, ChartSkeleton } from '@/shared/ui/charts';
import { Panel } from '@/shared/ui/Panel';
import { RangeTabs } from '@/shared/ui/RangeTabs';
import { ErrorState } from '@/shared/ui/states';

const CHART_HEIGHT = 'h-80 md:h-96';
const MODES = ['candles', 'line'] as const;

export function PriceChartPanel({ ticker }: { ticker: string }) {
  const { t } = useTranslation();
  const format = useFormat();
  const [range, setRange] = useState<HistoryRange>('6M');
  const [mode, setMode] = useState<(typeof MODES)[number]>('candles');
  const { data, isPending, isError, refetch } = useAssetCandles(ticker, range);

  const first = data?.candles[0];
  const last = data?.candles.at(-1);
  const summary =
    first && last
      ? t('asset.chart.summary', {
          from: format.date(first.date),
          to: format.date(last.date),
          start: format.price(first.close),
          end: format.price(last.close),
          change: format.percent(last.close / first.close - 1, { signed: true }),
        })
      : '';

  return (
    <Panel
      title={t('asset.chart.title')}
      className="xl:col-span-8"
      actions={
        <>
          <div role="group" aria-label={t('asset.chart.mode')} className="flex">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m);
                }}
                className={cn(
                  'h-7 px-2 text-xs',
                  mode === m
                    ? 'bg-accent text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t(`asset.chart.${m}`)}
              </button>
            ))}
          </div>
          <RangeTabs value={range} onChange={setRange} label={t('ranges.label')} />
        </>
      }
    >
      {isPending ? (
        <ChartSkeleton className={CHART_HEIGHT} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <CandleChart
          candles={data.candles}
          mode={mode}
          ariaLabel={t('asset.chart.aria', { ticker })}
          summary={summary}
          className={cn(CHART_HEIGHT, 'flex flex-col')}
        />
      )}
    </Panel>
  );
}
