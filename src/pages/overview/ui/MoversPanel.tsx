import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAssets } from '@/entities/asset';
import { useLivePositions, type PositionItem } from '@/entities/portfolio';
import { Flash } from '@/shared/ui/Flash';
import { useFormat } from '@/shared/i18n';
import { Delta } from '@/shared/ui/Delta';
import { Panel } from '@/shared/ui/Panel';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/states';
import { topMovers } from '../model/selectors';

function MoverList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: readonly PositionItem[];
  emptyText: string;
}) {
  const format = useFormat();
  const { data: assets } = useAssets();
  return (
    <div className="min-w-0">
      <h3 className="mb-1 text-xs text-muted-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul>
          {items.map((p) => (
            <li key={p.ticker} className="border-b last:border-b-0">
              <Link
                to={`/assets/${p.ticker}`}
                className="-mx-1 flex items-center gap-3 px-1 py-1.5 hover:bg-accent"
              >
                <span className="min-w-0 flex-1">
                  <span className="num block text-[13px] font-medium text-foreground">
                    {p.ticker}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {assets?.find((a) => a.ticker === p.ticker)?.name}
                  </span>
                </span>
                <span className="text-right">
                  <span className="num block text-[13px] text-foreground">
                    <Flash value={p.currentPrice}>{format.price(p.currentPrice)}</Flash>
                  </span>
                  <Delta value={p.dayChangePct} kind="percent" className="text-xs" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MoversPanel() {
  const { t } = useTranslation();
  const { data, isPending, isError, refetch } = useLivePositions();

  return (
    <Panel title={t('overview.movers.title')} className="xl:col-span-5">
      {isPending ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : data.length === 0 ? (
        <EmptyState description={t('overview.movers.empty')} />
      ) : (
        <MoversColumns positions={data} />
      )}
    </Panel>
  );
}

function MoversColumns({ positions }: { positions: readonly PositionItem[] }) {
  const { t } = useTranslation();
  const { gainers, losers } = topMovers(positions);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <MoverList
        title={t('overview.movers.gainers')}
        items={gainers}
        emptyText={t('overview.movers.noGainers')}
      />
      <MoverList
        title={t('overview.movers.losers')}
        items={losers}
        emptyText={t('overview.movers.noLosers')}
      />
    </div>
  );
}
