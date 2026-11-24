import { useState } from 'react';
import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useFormat } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import type { ChartSlot } from './chartTheme';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  /** Доля 0…1. */
  weight: number;
  slot: ChartSlot;
}

interface DonutChartProps {
  slices: readonly DonutSlice[];
  centerLabel: string;
  centerValue: string;
  ariaLabel: string;
}

function SliceTooltip({ active, slice }: { active?: boolean; slice: DonutSlice | undefined }) {
  const format = useFormat();
  if (!active || !slice) return null;
  return (
    <div className="border bg-popover px-2 py-1.5 text-xs shadow-md">
      <div className="text-foreground">{slice.label}</div>
      <div className="num text-muted-foreground">
        {format.money(slice.value)} · {format.percent(slice.weight, { decimals: 1 })}
      </div>
    </div>
  );
}

/**
 * Кольцевая диаграмма долей. Легенда — HTML-таблица со значениями: она же служит
 * текстовой версией графика для скринридеров, поэтому сам SVG скрыт от них.
 */
export function DonutChart({ slices, centerLabel, centerValue, ariaLabel }: DonutChartProps) {
  const format = useFormat();
  const [activeKey, setActiveKey] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center xl:flex-col xl:items-stretch 2xl:flex-row 2xl:items-center">
      <div className="relative mx-auto aspect-square w-44 shrink-0" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          {/* SVG скрыт от скринридеров и клавиатуры: те же данные есть в таблице-легенде. */}
          <PieChart accessibilityLayer={false} tabIndex={-1}>
            <Pie
              data={slices.map((slice) => ({
                ...slice,
                fill: `var(${slice.slot})`,
                fillOpacity: activeKey === null || activeKey === slice.key ? 1 : 0.45,
              }))}
              dataKey="value"
              nameKey="label"
              innerRadius="68%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="var(--card)"
              strokeWidth={2}
              rootTabIndex={-1}
              isAnimationActive={false}
              onMouseEnter={(_, index) => {
                setActiveKey(slices[index]?.key ?? null);
              }}
              onMouseLeave={() => {
                setActiveKey(null);
              }}
            />
            <Tooltip
              content={({ active }) => (
                <SliceTooltip active={active} slice={slices.find((s) => s.key === activeKey)} />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-muted-foreground">{centerLabel}</span>
          <span className="num text-sm font-medium text-foreground">{centerValue}</span>
        </div>
      </div>

      <table className="w-full text-xs" aria-label={ariaLabel}>
        <tbody>
          {slices.map((slice) => (
            <tr
              key={slice.key}
              onMouseEnter={() => {
                setActiveKey(slice.key);
              }}
              onMouseLeave={() => {
                setActiveKey(null);
              }}
              className={cn(
                'border-b last:border-b-0',
                activeKey !== null && activeKey !== slice.key && 'opacity-60',
              )}
            >
              <th scope="row" className="py-1.5 text-left font-normal">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-[1px]"
                    style={{ backgroundColor: `var(${slice.slot})` }}
                  />
                  <span className="text-foreground">{slice.label}</span>
                </span>
              </th>
              <td className="num py-1.5 text-right text-muted-foreground">
                {format.money(slice.value, { compact: true })}
              </td>
              <td className="num w-16 py-1.5 text-right text-foreground">
                {format.percent(slice.weight, { decimals: 1 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
