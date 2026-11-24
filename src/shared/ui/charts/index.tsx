import { lazy, Suspense, type ComponentProps } from 'react';
import { Skeleton } from '@/shared/ui/skeleton';
import type { CandleChart as CandleChartComponent } from './CandleChart';
import type { DonutChart as DonutChartComponent } from './DonutChart';
import type { TimeSeriesChart as TimeSeriesChartComponent } from './TimeSeriesChart';

/**
 * Тяжёлые библиотеки графиков (Lightweight Charts, Recharts) грузятся отдельными чанками
 * при первом показе графика, а не в основном бандле.
 */
const TimeSeriesChartImpl = lazy(() =>
  import('./TimeSeriesChart').then((m) => ({ default: m.TimeSeriesChart })),
);
const CandleChartImpl = lazy(() =>
  import('./CandleChart').then((m) => ({ default: m.CandleChart })),
);
const DonutChartImpl = lazy(() => import('./DonutChart').then((m) => ({ default: m.DonutChart })));

export function ChartSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className ?? 'h-full min-h-40 w-full'} />;
}

export function TimeSeriesChart(props: ComponentProps<typeof TimeSeriesChartComponent>) {
  return (
    <Suspense fallback={<ChartSkeleton className={props.className} />}>
      <TimeSeriesChartImpl {...props} />
    </Suspense>
  );
}

export function CandleChart(props: ComponentProps<typeof CandleChartComponent>) {
  return (
    <Suspense fallback={<ChartSkeleton className={props.className} />}>
      <CandleChartImpl {...props} />
    </Suspense>
  );
}

export function DonutChart(props: ComponentProps<typeof DonutChartComponent>) {
  return (
    <Suspense fallback={<ChartSkeleton className="h-44 w-full" />}>
      <DonutChartImpl {...props} />
    </Suspense>
  );
}

export type { TimeSeries } from './TimeSeriesChart';
export type { DonutSlice } from './DonutChart';
export { CHART_SLOTS, type ChartSlot } from './chartTheme';
