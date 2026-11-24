import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useFormat } from '@/shared/i18n';
import type { IsoMonth } from '@/shared/model';
import { cssVar, type ChartSlot } from './chartTheme';

export interface MonthlyBarChartProps {
  data: readonly { month: IsoMonth; amount: number }[];
  slot: ChartSlot;
  ariaLabel: string;
  summary: string;
  className?: string;
}

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload?: { month: IsoMonth; amount: number } }[];
}) {
  const format = useFormat();
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="border bg-popover px-2 py-1.5 text-xs shadow-md">
      <div className="text-muted-foreground">{format.month(point.month)}</div>
      <div className="num text-foreground">{format.money(point.amount)}</div>
    </div>
  );
}

/** Столбцы по месяцам (одна серия): тонкие столбцы, приглушённые оси, подсказка при наведении. */
export function MonthlyBarChart({
  data,
  slot,
  ariaLabel,
  summary,
  className,
}: MonthlyBarChartProps) {
  const format = useFormat();
  const axis = cssVar('--chart-axis');

  return (
    <figure className={className} aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={[...data]}
          margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
          barCategoryGap={2}
        >
          <CartesianGrid vertical={false} stroke={cssVar('--chart-grid')} />
          <XAxis
            dataKey="month"
            tickFormatter={(month: string) => format.month(month)}
            tick={{ fill: axis, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: cssVar('--border') }}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(value: number) => format.money(value, { compact: true })}
            tick={{ fill: axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip cursor={{ fill: 'var(--accent)' }} content={<BarTooltip />} />
          <Bar
            dataKey="amount"
            fill={`var(${slot})`}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
