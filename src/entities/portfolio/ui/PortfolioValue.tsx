import { useTranslation } from 'react-i18next';
import { useFormat } from '@/shared/i18n';
import { Delta } from '@/shared/ui/Delta';
import { Skeleton } from '@/shared/ui/skeleton';
import { Flash } from '@/shared/ui/Flash';
import { useLiveSummary } from '../model/live';

/** Стоимость портфеля и изменение за день — главный показатель в шапке. */
export function PortfolioValue() {
  const { t } = useTranslation();
  const format = useFormat();
  const { data, isPending, isError } = useLiveSummary();

  return (
    <div className="flex min-w-0 items-baseline gap-3" aria-live="polite">
      <span className="sr-only">{t('header.portfolioValue')}</span>
      {isPending ? (
        <Skeleton className="h-5 w-36" />
      ) : isError ? (
        <span className="num text-base text-muted-foreground">—</span>
      ) : (
        <>
          <span className="num shrink-0 text-base font-medium text-foreground sm:text-lg">
            <Flash value={data.totalValue}>{format.money(data.totalValue)}</Flash>
          </span>
          <span className="flex items-baseline gap-2 text-xs sm:text-[13px]">
            <span className="sr-only">{t('header.dayChange')}</span>
            <Delta value={data.dayChange} kind="money" arrow={false} className="max-sm:hidden" />
            <Delta value={data.dayChangePct} kind="percent" />
          </span>
        </>
      )}
    </div>
  );
}
