import { trendOf } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';

interface SparklineProps {
  values: readonly number[];
  className?: string;
}

const WIDTH = 96;
const HEIGHT = 24;

/** Мини-график без осей. Цвет — по направлению за период (рост/падение). Декоративный. */
export function Sparkline({ values, className }: SparklineProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = WIDTH / (values.length - 1);
  const points = values
    .map(
      (v, i) =>
        `${(i * step).toFixed(1)},${(HEIGHT - 2 - ((v - min) / span) * (HEIGHT - 4)).toFixed(1)}`,
    )
    .join(' ');
  const trend = trendOf((values.at(-1) ?? 0) - (values[0] ?? 0));

  return (
    <svg
      viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
      width={WIDTH}
      height={HEIGHT}
      aria-hidden="true"
      className={cn(
        trend === 'down' ? 'text-loss' : trend === 'up' ? 'text-gain' : 'text-muted-foreground',
        className,
      )}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
