import type { TimeSeriesChartProps } from '@/shared/ui/charts/TimeSeriesChart';

/** Тестовая замена canvas-графика: та же доступная разметка, серии — в data-атрибуте. */
export function TimeSeriesChart({ series, ariaLabel, summary, className }: TimeSeriesChartProps) {
  return (
    <div className={className}>
      <div role="img" aria-label={ariaLabel} data-series={series.map((s) => s.id).join(',')} />
      <p>{summary}</p>
    </div>
  );
}
