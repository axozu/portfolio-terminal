import {
  AreaSeries,
  type AutoscaleInfo,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFormat } from '@/shared/i18n';
import type { IsoDate } from '@/shared/model';
import { cssVar, withAlpha, type ChartSlot } from './chartTheme';
import { timeToIsoDate } from './time';
import { useLightweightChart } from './useLightweightChart';

export interface TimeSeries {
  id: string;
  label: string;
  slot: ChartSlot;
  kind?: 'area' | 'line';
  /** Верхняя граница шкалы (например, 0 для просадки, которая не бывает положительной). */
  ceiling?: number;
  data: readonly { date: IsoDate; value: number }[];
}

export interface TimeSeriesChartProps {
  series: readonly TimeSeries[];
  valueFormat: 'money' | 'price' | 'percent';
  /** Короткое описание для скринридеров: что показано. */
  ariaLabel: string;
  /** Текстовое резюме: начало, конец, изменение. */
  summary: string;
  className?: string;
}

type AnySeries = ISeriesApi<'Area'> | ISeriesApi<'Line'>;

function addSeries(chart: IChartApi, series: TimeSeries): AnySeries {
  const color = cssVar(series.slot);
  const { ceiling } = series;
  const common = {
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerRadius: 4,
    autoscaleInfoProvider:
      ceiling === undefined
        ? undefined
        : (original: () => AutoscaleInfo | null) => {
            const info = original();
            return info?.priceRange
              ? { ...info, priceRange: { ...info.priceRange, maxValue: ceiling } }
              : info;
          },
  };
  const api: AnySeries =
    series.kind === 'line'
      ? chart.addSeries(LineSeries, { ...common, color, lineWidth: 2 })
      : chart.addSeries(AreaSeries, {
          ...common,
          lineColor: color,
          lineWidth: 2,
          topColor: withAlpha(color, 0.24),
          bottomColor: withAlpha(color, 0),
        });
  api.setData(series.data.map((p) => ({ time: p.date, value: p.value })));
  // С потолком у шкалы нет верхнего отступа — иначе ось подпишет значения выше потолка.
  if (ceiling !== undefined) {
    chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.02, bottom: 0.08 } });
  }
  return api;
}

/** График временного ряда (линия/область) на Lightweight Charts с легендой при наведении. */
export function TimeSeriesChart({
  series,
  valueFormat,
  ariaLabel,
  summary,
  className,
}: TimeSeriesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const summaryId = useId();
  const format = useFormat();
  const chart = useLightweightChart(containerRef);
  const apisRef = useRef(new Map<string, AnySeries>());
  const [hover, setHover] = useState<{ date: IsoDate; values: Map<string, number> } | null>(null);

  const formatValue = useMemo(
    () => (value: number) =>
      valueFormat === 'money'
        ? format.money(value)
        : valueFormat === 'percent'
          ? format.percent(value, { decimals: 1 })
          : format.price(value),
    [format, valueFormat],
  );

  useEffect(() => {
    chart?.applyOptions({
      localization: {
        locale: format.locale === 'ru' ? 'ru-RU' : 'en-US',
        // На оси — без копеек: точное значение видно в легенде при наведении.
        priceFormatter: (value: number) =>
          valueFormat === 'money' ? format.money(value, { decimals: 0 }) : formatValue(value),
        timeFormatter: (time: Time) => format.date(timeToIsoDate(time)),
      },
    });
  }, [chart, format, formatValue, valueFormat]);

  useEffect(() => {
    if (!chart) return;
    const apis = apisRef.current;
    for (const api of apis.values()) chart.removeSeries(api);
    apis.clear();
    for (const s of series) apis.set(s.id, addSeries(chart, s));
    chart.timeScale().fitContent();
  }, [chart, series]);

  useEffect(() => {
    if (!chart) return;
    const onMove = (param: MouseEventParams) => {
      if (param.time === undefined) {
        setHover(null);
        return;
      }
      const values = new Map<string, number>();
      for (const [id, api] of apisRef.current) {
        const point = param.seriesData.get(api);
        if (point && 'value' in point) values.set(id, point.value);
      }
      setHover({ date: timeToIsoDate(param.time), values });
    };
    chart.subscribeCrosshairMove(onMove);
    return () => {
      chart.unsubscribeCrosshairMove(onMove);
    };
  }, [chart]);

  const legend = useMemo(
    () =>
      series.map((s) => ({
        ...s,
        value: hover?.values.get(s.id) ?? s.data.at(-1)?.value,
      })),
    [series, hover],
  );
  const legendDate = hover?.date ?? series[0]?.data.at(-1)?.date;

  return (
    <div className={className}>
      <div className="mb-2 flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {legend.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-0.5 w-3"
              style={{ backgroundColor: `var(${s.slot})` }}
            />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="num text-foreground">
              {s.value === undefined ? '—' : formatValue(s.value)}
            </span>
          </span>
        ))}
        {legendDate ? (
          <span className="num ml-auto text-muted-foreground">{format.date(legendDate)}</span>
        ) : null}
      </div>
      <div
        ref={containerRef}
        role="img"
        aria-label={ariaLabel}
        aria-describedby={summaryId}
        className="min-h-0 w-full flex-1"
      />
      <p id={summaryId} className="sr-only">
        {summary}
      </p>
    </div>
  );
}
