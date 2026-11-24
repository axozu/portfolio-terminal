import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useAssets } from '@/entities/asset';
import { useFormat } from '@/shared/i18n';
import { useUiStore } from '@/shared/store/ui';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Delta } from '@/shared/ui/Delta';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/skeleton';
import { ErrorState } from '@/shared/ui/states';
import { AssetNotFound } from './ui/AssetNotFound';
import { AssetTransactionsPanel } from './ui/AssetTransactionsPanel';
import { PositionPanel } from './ui/PositionPanel';
import { PriceChartPanel } from './ui/PriceChartPanel';

export function AssetPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const openCreateForm = useUiStore((s) => s.openCreateForm);
  const ticker = (useParams().ticker ?? '').toUpperCase();
  const { data: assets, isPending, isError, refetch } = useAssets();
  const asset = assets?.find((a) => a.ticker === ticker);

  if (isPending) {
    return (
      <section data-testid="page-asset" className="flex flex-col gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </section>
    );
  }
  if (isError) {
    return (
      <section data-testid="page-asset">
        <ErrorState onRetry={() => void refetch()} />
      </section>
    );
  }
  if (!asset) {
    return (
      <section data-testid="page-asset">
        <AssetNotFound ticker={ticker} />
      </section>
    );
  }

  const change = asset.previousClose > 0 ? asset.price / asset.previousClose - 1 : 0;

  return (
    <section data-testid="page-asset" className="flex flex-col gap-3 md:gap-4">
      <PageHeader
        title={
          <span className="flex flex-wrap items-baseline gap-x-3">
            <span className="num">{asset.ticker}</span>
            <span className="text-base font-normal text-muted-foreground">{asset.name}</span>
          </span>
        }
        meta={
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{t(`assetClass.${asset.class}`)}</Badge>
            <Badge variant="outline">
              {asset.sector ? t(`sector.${asset.sector}`) : t('asset.noSector')}
            </Badge>
            <span className="num text-base text-foreground">{format.price(asset.price)}</span>
            <Delta value={change} kind="percent" />
          </span>
        }
        actions={
          <>
            <Button
              onClick={() => {
                openCreateForm({ type: 'buy', ticker: asset.ticker });
              }}
            >
              {t('asset.buy')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                openCreateForm({ type: 'sell', ticker: asset.ticker });
              }}
            >
              {t('asset.sell')}
            </Button>
          </>
        }
      />
      <div className="grid gap-3 md:gap-4 xl:grid-cols-12">
        <PriceChartPanel ticker={asset.ticker} />
        <PositionPanel ticker={asset.ticker} quantityPrecision={asset.quantityPrecision} />
        <AssetTransactionsPanel ticker={asset.ticker} />
      </div>
    </section>
  );
}
