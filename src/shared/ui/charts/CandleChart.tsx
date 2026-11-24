import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type ISeriesApi,
  type MouseEventParams,
  type SeriesType,
} from 'lightweight-charts';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '@/shared/i18n';
import type { Candle } from '@/shared/model';
import { cssVar, readChartTheme, withAlpha } from './chartTheme';
import { timeToIsoDate } from './time';
import { useLightweightChart } from './useLightweightChart';

export interface CandleChartProps {
  candles: readonly Candle[];
  mode: 'candles' | 'line';
  ariaLabel: string;
  summary: string;
  className?: string;
}

/** Свечной график с объёмами (или линия закрытий) и OHLC-легендой при наведении. */
export function CandleChart({ candles, mode, ariaLabel, summary, className }: CandleChartProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const containerRef = useRef<HTMLDivElement>(null);
  const summaryId = useId();
  const chart = useLightweightChart(containerRef);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  useEffect(() => {
    chart?.applyOptions({
      localization: {
        locale: format.locale === 'ru' ? 'ru-RU' : 'en-US',
        priceFormatter: (value: number) => format.price(value),
      },
    });
  }, [chart, format]);

  useEffect(() => {
    if (!chart) return;
    const theme = readChartTheme();
    const added: ISeriesApi<SeriesType>[] = [];

    if (mode === 'candles') {
      const price = chart.addSeries(CandlestickSeries, {
        upColor: theme.gain,
        downColor: theme.loss,
        borderVisible: false,
        wickUpColor: theme.gain,
        wickDownColor: theme.loss,
        priceLineVisible: false,
      });
      price.setData(candles.map((c) => ({ ...c, time: c.date })));
      added.push(price);
    } else {
      const line = chart.addSeries(LineSeries, {
        color: cssVar('--chart-1'),
        lineWidth: 2,
        priceLineVisible: false,
      });
      line.setData(candles.map((c) => ({ time: c.date, value: c.close })));
      added.push(line);
    }

    const volume = chart.addSeries(HistogramSeries, {
      priceScaleId: '',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volume.setData(
      candles.map((c) => ({
        time: c.date,
        value: c.volume,
        color: withAlpha(c.close >= c.open ? theme.gain : theme.loss, 0.35),
      })),
    );
    added.push(volume);
    chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.08, bottom: 0.22 } });
    chart.timeScale().fitContent();

    return () => {
      for (const series of added) chart.removeSeries(series);
    };
  }, [chart, candles, mode]);

  useEffect(() => {
    if (!chart) return;
    const onMove = (param: MouseEventParams) => {
      setHoverDate(param.time === undefined ? null : timeToIsoDate(param.time));
    };
    chart.subscribeCrosshairMove(onMove);
    return () => {
      chart.unsubscribeCrosshairMove(onMove);
    };
  }, [chart]);

  const shown = useMemo(
    () => (hoverDate ? candles.find((c) => c.date === hoverDate) : undefined) ?? candles.at(-1),
    [candles, hoverDate],
  );

  return (
    <div className={className}>
      <div className="num mb-2 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <dl className="flex flex-wrap gap-x-3 gap-y-1">
          {shown
            ? (
                [
                  ['O', shown.open],
                  ['H', shown.high],
                  ['L', shown.low],
                  ['C', shown.close],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex gap-1">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-foreground">{format.price(value)}</dd>
                </div>
              ))
            : null}
          {shown ? (
            <div className="flex gap-1">
              <dt className="text-muted-foreground">{t('asset.chart.volume')}</dt>
              <dd className="text-foreground">{format.number(shown.volume, { decimals: 0 })}</dd>
            </div>
          ) : null}
        </dl>
        {shown ? (
          <span className="ml-auto text-muted-foreground">{format.date(shown.date)}</span>
        ) : null}
      </div>
      <div
        ref={containerRef}
        role="img"
        aria-label={ariaLabel}
        aria-describedby={summaryId}
        className="h-full min-h-0 w-full"
      />
      <p id={summaryId} className="sr-only">
        {summary}
      </p>
    </div>
  );
}
