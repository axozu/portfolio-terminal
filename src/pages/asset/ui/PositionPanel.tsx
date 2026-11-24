import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLivePositions } from '@/entities/portfolio';
import { useFormat } from '@/shared/i18n';
import { Delta } from '@/shared/ui/Delta';
import { Panel } from '@/shared/ui/Panel';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/states';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1.5 last:border-b-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num text-[13px] text-foreground">{children}</dd>
    </div>
  );
}

interface PositionPanelProps {
  ticker: string;
  quantityPrecision: number;
}

export function PositionPanel({ ticker, quantityPrecision }: PositionPanelProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const { data, isPending, isError, refetch } = useLivePositions();
  const position = data?.find((p) => p.ticker === ticker);

  return (
    <Panel title={t('asset.position.title')} className="xl:col-span-4">
      {isPending ? (
        <div className="grid gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : !position ? (
        <EmptyState title={t('asset.position.none')} description={t('asset.position.noneHint')} />
      ) : (
        <dl>
          <Row label={t('asset.position.quantity')}>
            {format.quantity(position.quantity, quantityPrecision)}
          </Row>
          <Row label={t('asset.position.avgPrice')}>{format.price(position.averagePrice)}</Row>
          <Row label={t('asset.position.value')}>{format.money(position.marketValue)}</Row>
          <Row label={t('asset.position.pnl')}>
            <Delta value={position.unrealizedPnl} kind="money" arrow={false} />{' '}
            <Delta value={position.unrealizedPnlPct} kind="percent" className="text-xs" />
          </Row>
          <Row label={t('asset.position.realized')}>
            <Delta value={position.realizedPnl} kind="money" arrow={false} />
          </Row>
          <Row label={t('asset.position.dividends')}>{format.money(position.dividends)}</Row>
          <Row label={t('asset.position.weight')}>
            {format.percent(position.weight, { decimals: 1 })}
          </Row>
        </dl>
      )}
    </Panel>
  );
}
