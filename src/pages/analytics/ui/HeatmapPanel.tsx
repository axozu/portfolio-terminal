import { useTranslation } from 'react-i18next';
import type { MonthlyReturn } from '@/shared/lib/finance';
import { useFormat } from '@/shared/i18n';
import { trendOf } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Panel } from '@/shared/ui/Panel';
import { buildHeatmap, heatIntensity } from '../model/heatmap';

/** Расходящаяся шкала: падение — красный, рост — зелёный, около нуля — фон. Насыщенность по модулю. */
function cellStyle(value: number) {
  const trend = trendOf(value, 0.0005);
  if (trend === 'flat') return undefined;
  // Не больше 38%: светлый текст на самой яркой ячейке сохраняет контраст WCAG AA.
  const share = Math.round(8 + heatIntensity(value) * 30);
  const color = trend === 'up' ? 'var(--gain)' : 'var(--loss)';
  return { backgroundColor: `color-mix(in oklab, ${color} ${String(share)}%, transparent)` };
}

const MONTH_INDEXES = Array.from({ length: 12 }, (_, i) => i);

export function HeatmapPanel({ monthly }: { monthly: readonly MonthlyReturn[] }) {
  const { t } = useTranslation();
  const format = useFormat();
  const rows = buildHeatmap(monthly);
  // Короткие названия месяцев по текущей локали (2001 — произвольный невисокосный год).
  const monthLabel = (index: number) =>
    format.month(`2001-${String(index + 1).padStart(2, '0')}`).replace(/\s*2001.*$/, '');

  return (
    <Panel
      title={t('analytics.heatmap.title')}
      className="xl:col-span-12"
      actions={
        <span className="flex items-center gap-2 text-xs text-muted-foreground" aria-hidden="true">
          {t('analytics.heatmap.legendDown')}
          <span className="h-2 w-24 rounded-[1px] bg-[linear-gradient(90deg,color-mix(in_oklab,var(--loss)_38%,transparent),transparent,color-mix(in_oklab,var(--gain)_38%,transparent))]" />
          {t('analytics.heatmap.legendUp')}
        </span>
      }
      bodyClassName="overflow-x-auto p-0"
    >
      <table className="w-full min-w-[46rem] border-collapse text-xs">
        <caption className="sr-only">{t('analytics.heatmap.caption')}</caption>
        <thead>
          <tr className="border-b text-muted-foreground">
            <th scope="col" className="px-3 py-2 text-left font-normal">
              {t('analytics.heatmap.year')}
            </th>
            {MONTH_INDEXES.map((i) => (
              <th key={i} scope="col" className="px-1 py-2 text-center font-normal">
                {monthLabel(i)}
              </th>
            ))}
            <th scope="col" className="border-l px-3 py-2 text-right font-normal">
              {t('analytics.heatmap.total')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year} className="border-b last:border-b-0">
              <th scope="row" className="num px-3 py-1 text-left font-medium text-foreground">
                {row.year}
              </th>
              {row.months.map((value, i) => (
                <td key={i} className="p-0.5">
                  {value === null ? (
                    <span className="flex h-8 items-center justify-center text-muted-foreground/50">
                      <span aria-hidden="true">·</span>
                      <span className="sr-only">{t('analytics.heatmap.noData')}</span>
                    </span>
                  ) : (
                    <span
                      style={cellStyle(value)}
                      className="num flex h-8 items-center justify-center rounded-[1px] text-foreground"
                    >
                      {format.percent(value, { signed: true, decimals: 1 })}
                    </span>
                  )}
                </td>
              ))}
              <td
                className={cn(
                  'num border-l px-3 py-1 text-right font-medium',
                  row.total >= 0 ? 'text-gain' : 'text-loss',
                )}
              >
                {format.percent(row.total, { signed: true, decimals: 1 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
