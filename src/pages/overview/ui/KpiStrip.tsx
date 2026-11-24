import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortfolioSummary } from '@/entities/portfolio';
import { useFormat } from '@/shared/i18n';
import { Delta } from '@/shared/ui/Delta';
import { Skeleton } from '@/shared/ui/skeleton';
import { ErrorState } from '@/shared/ui/states';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

interface KpiProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  hint?: string;
}

function Kpi({ label, value, sub, hint }: KpiProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-3 py-2.5 md:px-4">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {hint ? (
          <Tooltip>
            <TooltipTrigger
              aria-label={hint}
              className="rounded-sm text-muted-foreground hover:text-foreground"
            >
              <Info aria-hidden="true" className="size-3" />
            </TooltipTrigger>
            <TooltipContent className="max-w-64">{hint}</TooltipContent>
          </Tooltip>
        ) : null}
      </dt>
      <dd className="num truncate text-lg leading-tight text-foreground md:text-xl">{value}</dd>
      {sub ? <dd className="truncate text-xs text-muted-foreground">{sub}</dd> : null}
    </div>
  );
}

/**
 * У ячеек рамки справа и снизу; внешний контейнер обрезает крайние, поэтому линии
 * всегда одинарные при любом числе колонок, а пустые места остаются цветом панели.
 */
const CELLS =
  '-mr-px -mb-px grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 [&>*]:border-r [&>*]:border-b';
const FRAME = 'overflow-hidden border bg-card';

/** Строка ключевых показателей: одна панель с разделителями, а не пять одинаковых карточек. */
export function KpiStrip() {
  const { t } = useTranslation();
  const format = useFormat();
  const { data, isPending, isError, refetch } = usePortfolioSummary();

  if (isPending) {
    return (
      <div className={FRAME}>
        <div className={CELLS}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2 px-4 py-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="border bg-card px-4">
        <ErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className={FRAME}>
      <dl className={CELLS}>
        <Kpi
          label={t('overview.kpi.totalValue')}
          value={format.money(data.totalValue)}
          sub={t('overview.kpi.invested', {
            amount: format.money(data.netInvested, { compact: true }),
          })}
        />
        <Kpi
          label={t('overview.kpi.dayChange')}
          value={<Delta value={data.dayChange} kind="money" arrow={false} />}
          sub={<Delta value={data.dayChangePct} kind="percent" />}
        />
        <Kpi
          label={t('overview.kpi.totalReturn')}
          hint={t('overview.kpi.totalReturnHint')}
          value={
            data.totalReturnPct === null ? (
              '—'
            ) : (
              <Delta value={data.totalReturnPct} kind="percent" />
            )
          }
          sub={<Delta value={data.totalReturn} kind="money" arrow={false} />}
        />
        <Kpi
          label={t('overview.kpi.unrealized')}
          value={<Delta value={data.unrealizedPnl} kind="money" arrow={false} />}
        />
        <Kpi
          label={t('overview.kpi.cash')}
          value={format.money(data.cash)}
          sub={t('overview.kpi.ofPortfolio', {
            share: format.percent(data.totalValue > 0 ? data.cash / data.totalValue : 0, {
              decimals: 1,
            }),
          })}
        />
      </dl>
    </div>
  );
}
