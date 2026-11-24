import type { CandleChartProps } from '@/shared/ui/charts/CandleChart';

/** Тестовая замена canvas-графика свечей. */
export function CandleChart({ candles, mode, ariaLabel, summary, className }: CandleChartProps) {
  return (
    <div className={className}>
      <div aria-label={ariaLabel} role="img" data-mode={mode} data-count={candles.length} />
      <p>{summary}</p>
    </div>
  );
}
