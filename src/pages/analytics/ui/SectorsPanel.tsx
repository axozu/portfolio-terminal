import { useTranslation } from 'react-i18next';
import type { AnalyticsResponse } from '@/shared/api';
import { useFormat } from '@/shared/i18n';
import { Panel } from '@/shared/ui/Panel';

/**
 * Горизонтальные бары: величина долей одним цветом (это не категории, а размер).
 * Разметка — список с подписями и значениями, поэтому доступна без отдельной таблицы.
 */
export function SectorsPanel({ sectors }: { sectors: AnalyticsResponse['sectors'] }) {
  const { t } = useTranslation();
  const format = useFormat();
  const maxWeight = Math.max(...sectors.map((s) => s.weight), 0.0001);

  return (
    <Panel title={t('analytics.sectors.title')} className="xl:col-span-4">
      <ul aria-label={t('analytics.sectors.aria')} className="flex flex-col gap-2.5">
        {sectors.map((slice) => {
          const label =
            slice.key === 'stock' ||
            slice.key === 'etf' ||
            slice.key === 'bond' ||
            slice.key === 'crypto'
              ? t(`assetClass.${slice.key}`)
              : t(`sector.${slice.key}`);
          return (
            <li key={slice.key} className="text-xs">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-foreground">{label}</span>
                <span className="num shrink-0 text-muted-foreground">
                  {format.money(slice.value, { compact: true })}
                  <span className="ml-2 text-foreground">
                    {format.percent(slice.weight, { decimals: 1 })}
                  </span>
                </span>
              </div>
              <div className="h-1.5 w-full rounded-[1px] bg-raised" aria-hidden="true">
                <div
                  className="h-full rounded-[1px] bg-chart-1"
                  style={{ width: `${String((slice.weight / maxWeight) * 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
